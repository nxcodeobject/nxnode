const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// `fs.existsSync` (stat-based) can follow a symlink/junction and fail on some
// Windows setups, reporting a valid link as missing. lstat is reliable here.
function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    try {
      fs.statSync(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

function getStorePath() {
  return config.get('storePath');
}

function encodeName(name) {
  return name.replace(/\//g, '+');
}

function decodeName(encoded) {
  return encoded.replace(/\+/g, '/');
}

function getPackageDir(name, version) {
  return path.join(getStorePath(), 'packages', encodeName(name), version);
}

function ensureStore() {
  const storePath = getStorePath();
  const dirs = [
    storePath,
    path.join(storePath, 'packages'),
    path.join(storePath, 'metadata'),
    path.join(storePath, 'indexes')
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function packageExists(name, version) {
  const pkgDir = getPackageDir(name, version);
  return pathExists(pkgDir) && pathExists(path.join(pkgDir, 'package'));
}

function saveMetadata(name, version, metadata) {
  ensureStore();
  const metaPath = path.join(getStorePath(), 'metadata', `${encodeName(name)}@${version}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

function getMetadata(name, version) {
  const metaPath = path.join(getStorePath(), 'metadata', `${encodeName(name)}@${version}.json`);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

function listPackages() {
  const packagesDir = path.join(getStorePath(), 'packages');
  if (!fs.existsSync(packagesDir)) return [];

  const packages = [];
  const names = fs.readdirSync(packagesDir);
  for (const encodedName of names) {
    const versionsDir = path.join(packagesDir, encodedName);
    if (!fs.statSync(versionsDir).isDirectory()) continue;
    const versions = fs.readdirSync(versionsDir);
    for (const version of versions) {
      packages.push({ name: decodeName(encodedName), version });
    }
  }
  return packages;
}

function removePackage(name, version) {
  const pkgDir = getPackageDir(name, version);
  if (fs.existsSync(pkgDir)) {
    fs.rmSync(pkgDir, { recursive: true, force: true });
  }
  const metaPath = path.join(getStorePath(), 'metadata', `${encodeName(name)}@${version}.json`);
  if (fs.existsSync(metaPath)) {
    fs.unlinkSync(metaPath);
  }
}

module.exports = {
  getStorePath,
  getPackageDir,
  ensureStore,
  packageExists,
  saveMetadata,
  getMetadata,
  listPackages,
  removePackage
};
