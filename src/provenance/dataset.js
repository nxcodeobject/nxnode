const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

// Encode scoped names the same way the store does, so a package's dataset file
// path stays a single valid folder name (node_modules keeps the real name).
function encodeName(name) {
  return name.replace(/\//g, '+');
}

function datasetFilePath(dir, name, version) {
  return path.join(dir, 'packages', encodeName(name), `${version}.json`);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Tulis dataset terbuka dari hasil provenance: satu file JSON per package plus
 * sebuah index. Murni dari data yang diberikan (tanpa network).
 * Mengembalikan { index, packages: <jumlah file> }.
 */
function writeDataset(entries, dir, options = {}) {
  const generatedAt = options.now || new Date().toISOString();
  const packages = [];

  for (const entry of entries) {
    const record = {
      name: entry.name,
      version: entry.version,
      origin: entry.origin,
      license: entry.license,
      quality: entry.quality
    };
    if (entry.vulnerabilities) {
      record.vulnerabilities = entry.vulnerabilities;
    }

    writeJson(datasetFilePath(dir, entry.name, entry.version), record);
    packages.push({
      name: entry.name,
      version: entry.version,
      license: entry.license?.declared || null,
      vulnerabilities: entry.vulnerabilities?.length || 0
    });
  }

  const index = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    tool: 'nxnode',
    packageCount: packages.length,
    packages
  };
  writeJson(path.join(dir, 'index.json'), index);

  return { index, packages: packages.length };
}

module.exports = { writeDataset, datasetFilePath, encodeName, SCHEMA_VERSION };
