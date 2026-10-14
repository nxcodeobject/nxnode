const https = require('https');

const OSV_API = 'https://api.osv.dev/v1/querybatch';

/**
 * Query vulnerability data dari OSV untuk sekumpulan package npm.
 * Mengembalikan Map: "<name>@<version>" -> array { id, modified }.
 *
 * Memakai POST /v1/querybatch (satu request untuk banyak package). Hanya id
 * dan modified yang dikembalikan oleh endpoint batch (sesuai dokumentasi OSV).
 * Operasi ini butuh network; pemanggil harus menanganinya sebagai best-effort.
 */
function queryBatch(packages) {
  return new Promise((resolve, reject) => {
    const queries = packages.map(({ name, version }) => ({
      package: { ecosystem: 'npm', name },
      version
    }));

    if (queries.length === 0) {
      resolve(new Map());
      return;
    }

    const body = JSON.stringify({ queries });
    const req = https.request(
      OSV_API,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`OSV HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(toResultMap(packages, parsed.results || []));
          } catch (err) {
            reject(err);
          }
        });
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function toResultMap(packages, results) {
  const map = new Map();
  packages.forEach((pkg, index) => {
    const result = results[index] || {};
    const vulns = (result.vulns || []).map((v) => ({ id: v.id, modified: v.modified }));
    map.set(`${pkg.name}@${pkg.version}`, vulns);
  });
  return map;
}

/**
 * Best-effort: kembalikan Map hasil OSV, atau Map kosong bila gagal (offline,
 * rate limit, dll) — provenance tidak boleh gagal hanya karena OSV tidak bisa
 * dihubungi. Sertakan alasan lewat properti non-enumerable? Tidak; cukup log.
 */
async function queryBatchSafe(packages, onError) {
  try {
    return { ok: true, results: await queryBatch(packages) };
  } catch (err) {
    if (onError) onError(err);
    return { ok: false, error: err.message, results: new Map() };
  }
}

module.exports = { queryBatch, queryBatchSafe, OSV_API };
