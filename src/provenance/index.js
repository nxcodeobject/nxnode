const path = require('path');
const fs = require('fs');
const store = require('../store/store');
const licenseModule = require('./license');
const qualityModule = require('./quality');

function readPackageJson(packageDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Kumpulkan provenance lengkap untuk satu package di store.
 * Menggabungkan metadata yang tersimpan saat install (origin/integrity/tarball)
 * dengan deteksi license (declared dari metadata, detected dari file LICENSE).
 */
function getProvenance(name, version) {
  if (!store.packageExists(name, version)) return null;

  const meta = store.getMetadata(name, version) || {};
  const packageDir = path.join(store.getPackageDir(name, version), 'package');
  const packageJson = readPackageJson(packageDir);

  const license = licenseModule.detectLicense(packageDir, packageJson);
  const quality = qualityModule.computeQuality(packageDir, packageJson, meta);

  return {
    name,
    version,
    origin: {
      source: meta.source || 'npm',
      tarball: meta.tarball || null,
      integrity: meta.integrity || null,
      installedAt: meta.installedAt || null
    },
    license: {
      declared: license.declared || (meta.license ? licenseModule.normalizeLicense(meta.license) : null),
      detected: license.detected || null,
      mismatch: license.mismatch
    },
    quality
  };
}

/**
 * Provenance untuk semua package di store, dengan filter nama opsional.
 */
function listProvenance(filterName) {
  const packages = store.listPackages();
  const results = [];
  for (const { name, version } of packages) {
    if (filterName && name !== filterName) continue;
    const provenance = getProvenance(name, version);
    if (provenance) results.push(provenance);
  }
  return results;
}

module.exports = { getProvenance, listProvenance };
