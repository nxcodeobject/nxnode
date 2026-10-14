const fs = require('fs');
const path = require('path');

const README_NAMES = ['README', 'README.md', 'README.txt', 'readme.md'];
const LICENSE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING'];
const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall'];

function existsAny(dir, names) {
  for (const name of names) {
    try {
      if (fs.existsSync(path.join(dir, name))) return true;
    } catch {
      // lewati
    }
  }
  return false;
}

/**
 * Hitung quality signals dari isi package di store + metadata yang tersimpan.
 * Semua sinyal adalah fakta terverifikasi — tidak ada penilaian subjektif.
 */
function computeQuality(packageDir, packageJson, metadata) {
  const pkg = packageJson || {};
  const meta = metadata || {};
  const scripts = pkg.scripts || {};

  const npmScripts = LIFECYCLE_SCRIPTS.filter((name) => Boolean(scripts[name]));

  return {
    hasReadme: existsAny(packageDir, README_NAMES),
    hasLicenseFile: existsAny(packageDir, LICENSE_NAMES),
    hasRepository: Boolean(pkg.repository),
    hasDescription: Boolean(pkg.description && String(pkg.description).trim()),
    hasKeywords: Array.isArray(pkg.keywords) && pkg.keywords.length > 0,
    dependencyCount: Object.keys(pkg.dependencies || {}).length,
    scriptCount: Object.keys(scripts).length,
    deprecated: Boolean(pkg.deprecated),
    integrityVerified: Boolean(meta.integrity),
    npmScripts
  };
}

module.exports = { computeQuality, README_NAMES, LICENSE_NAMES, LIFECYCLE_SCRIPTS };
