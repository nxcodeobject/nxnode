const fs = require('fs');
const path = require('path');

const LOCK_FILE = 'nxnode.lock';

function getLockPath(projectDir) {
  return path.join(projectDir, LOCK_FILE);
}

function readLockFile(projectDir) {
  const lockPath = getLockPath(projectDir);
  if (!fs.existsSync(lockPath)) return null;

  try {
    const content = fs.readFileSync(lockPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function writeLockFile(projectDir, data) {
  const lockPath = getLockPath(projectDir);
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(lockPath, content, 'utf-8');
}

function generateLockData(resolvedPackages) {
  const lock = {
    lockfileVersion: 1,
    packages: {}
  };

  for (const [key, pkg] of resolvedPackages) {
    lock.packages[key] = {
      version: pkg.version,
      resolved: `https://registry.npmjs.org/${pkg.name}/-/${pkg.name}-${pkg.version}.tgz`,
      integrity: pkg.integrity || '',
      dependencies: pkg.dependencies || {}
    };
  }

  return lock;
}

function removeFromLock(projectDir, packageName) {
  const lock = readLockFile(projectDir);
  if (!lock) return;

  const keys = Object.keys(lock.packages);
  for (const key of keys) {
    if (key.startsWith(`${packageName}@`)) {
      delete lock.packages[key];
    }
  }

  writeLockFile(projectDir, lock);
}

function isLocked(projectDir, packageName, version) {
  const lock = readLockFile(projectDir);
  if (!lock) return false;
  return !!lock.packages[`${packageName}@${version}`];
}

module.exports = {
  readLockFile,
  writeLockFile,
  generateLockData,
  removeFromLock,
  isLocked,
  getLockPath
};
