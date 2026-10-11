const https = require('https');
const http = require('http');

const NPM_REGISTRY = 'https://registry.npmjs.org';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
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
    dependencies: ver.dependencies || {},
    scripts: ver.scripts || {},
    os: ver.os,
    cpu: ver.cpu
  };
}

function fetchTarball(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchTarball(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = { getPackageInfo, getLatestVersion, getVersions, getPackageMetadata, fetchTarball };
