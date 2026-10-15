const https = require('https');
const http = require('http');

const NPM_REGISTRY = 'https://registry.npmjs.org';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 3;
const MAX_REDIRECTS = 5;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt, retryAfterMs) {
  if (retryAfterMs != null) return retryAfterMs;
  return Math.min(200 * Math.pow(2, attempt), 5000);
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

// Single GET with manual redirects, a hard timeout, and no retry logic (retry is
// layered on top by request()). Resolves { statusCode, headers, body: Buffer }.
function getOnce(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, redirectsLeft = MAX_REDIRECTS, headers = {} } = options;

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers }, (res) => {
      const { statusCode, headers: resHeaders } = res;

      if (statusCode >= 300 && statusCode < 400 && resHeaders.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        const nextUrl = new URL(resHeaders.location, url).toString();
        resolve(getOnce(nextUrl, { ...options, redirectsLeft: redirectsLeft - 1 }));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ statusCode, headers: resHeaders, body: Buffer.concat(chunks) })
      );
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${url}`));
    });
  });
}

/**
 * GET dengan retry + backoff. Mengembalikan Buffer body untuk status 2xx,
 * atau throw untuk status yang tidak bisa dipulihkan. Status yang bersifat
 * sementara (429/5xx/timeout/error jaringan) dicoba ulang.
 */
async function request(url, options = {}) {
  const { retries = DEFAULT_RETRIES } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await getOnce(url, options);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return res.body;
      }

      const err = new Error(`HTTP ${res.statusCode}`);
      err.statusCode = res.statusCode;

      if (!RETRYABLE_STATUS.has(res.statusCode) || attempt === retries) {
        throw err;
      }

      await delay(backoffMs(attempt, parseRetryAfter(res.headers['retry-after'])));
      lastError = err;
    } catch (err) {
      // Error jaringan / timeout / redirect berlebih: coba ulang kecuali sudah habis.
      if (err.statusCode && !RETRYABLE_STATUS.has(err.statusCode)) throw err;
      if (attempt === retries) throw err;
      await delay(backoffMs(attempt, null));
      lastError = err;
    }
  }

  throw lastError;
}

async function fetchJson(url, options) {
  const body = await request(url, options);
  return JSON.parse(body.toString('utf-8'));
}

async function getPackageInfo(name) {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}`;
  return fetchJson(url);
}

async function getLatestVersion(name) {
  const info = await getPackageInfo(name);
  return info['dist-tags']?.latest;
}

async function getVersions(name) {
  const info = await getPackageInfo(name);
  return Object.keys(info.versions || {});
}

async function getPackageMetadata(name, version) {
  const info = await getPackageInfo(name);
  const ver = info.versions?.[version];
  if (!ver) throw new Error(`Version ${version} not found for ${name}`);
  return {
    name: ver.name,
    version: ver.version,
    dist: ver.dist,
    license: ver.license,
    licenses: ver.licenses,
    dependencies: ver.dependencies || {},
    scripts: ver.scripts || {},
    os: ver.os,
    cpu: ver.cpu
  };
}

async function fetchTarball(url, options = {}) {
  return request(url, { timeoutMs: 120000, ...options });
}

module.exports = {
  getPackageInfo,
  getLatestVersion,
  getVersions,
  getPackageMetadata,
  fetchTarball,
  request,
  parseRetryAfter,
  backoffMs,
  getOnce,
  RETRYABLE_STATUS
};
