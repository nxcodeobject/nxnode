const fs = require('fs');
const path = require('path');
const config = require('../config/config');

function getManifestPath(projectDir) {
  return path.join(projectDir, 'node_modules', '.nxnode', 'links.json');
}

function readManifest(projectDir) {
  const manifestPath = getManifestPath(projectDir);
  if (!fs.existsSync(manifestPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeManifestEntry(projectDir, name, entry) {
  const manifestPath = getManifestPath(projectDir);
  const manifestDir = path.dirname(manifestPath);
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  const manifest = readManifest(projectDir);
  manifest[name] = entry;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

function removeManifestEntry(projectDir, name) {
  const manifest = readManifest(projectDir);
  if (!(name in manifest)) return;
  delete manifest[name];
  fs.writeFileSync(getManifestPath(projectDir), JSON.stringify(manifest, null, 2), 'utf-8');
}

function linkPackage(projectDir, name, version, storePackageDir) {
  const nodeModulesDir = path.join(projectDir, 'node_modules');
  const targetDir = path.join(nodeModulesDir, name);
  const sourceDir = path.join(storePackageDir, 'package');

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  if (fs.existsSync(targetDir)) {
    const stat = fs.lstatSync(targetDir);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  const linkMode = config.get('linkMode') || 'junction';
  let appliedMode = linkMode;

  try {
    switch (linkMode) {
      case 'symlink':
        fs.symlinkSync(sourceDir, targetDir, 'dir');
        break;
      case 'junction':
        if (process.platform === 'win32') {
          fs.symlinkSync(sourceDir, targetDir, 'junction');
        } else {
          fs.symlinkSync(sourceDir, targetDir, 'dir');
        }
        break;
      case 'hardlink':
        linkDirectoryHardlink(sourceDir, targetDir);
        break;
      case 'copy':
      default:
        appliedMode = 'copy';
        copyRecursive(sourceDir, targetDir);
        break;
    }
  } catch {
    try {
      appliedMode = 'copy';
      copyRecursive(sourceDir, targetDir);
    } catch {
      return false;
    }
  }

  writeManifestEntry(projectDir, name, {
    version,
    linkMode: appliedMode,
    storeSource: sourceDir,
    linkedAt: new Date().toISOString()
  });

  linkBinEntries(nodeModulesDir, name, targetDir);

  return true;
}

function linkDirectoryHardlink(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      linkDirectoryHardlink(srcPath, destPath);
    } else {
      try {
        fs.linkSync(srcPath, destPath);
      } catch {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function unlinkPackage(projectDir, name) {
  const targetDir = path.join(projectDir, 'node_modules', name);
  removeManifestEntry(projectDir, name);

  if (!fs.existsSync(targetDir)) return false;

  const stat = fs.lstatSync(targetDir);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    return true;
  }
  return false;
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function isLinked(projectDir, name) {
  const targetDir = path.join(projectDir, 'node_modules', name);
  if (!fs.existsSync(targetDir)) return false;
  const stat = fs.lstatSync(targetDir);
  return stat.isSymbolicLink();
}

function linkBinEntries(nodeModulesDir, depName, depSourceDir) {
  let pkgJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(path.join(depSourceDir, 'package.json'), 'utf-8'));
  } catch {
    return;
  }

  const bin = pkgJson.bin;
  if (!bin) return;

  const entries = typeof bin === 'string'
    ? [[pkgJson.name?.split('/').pop() || depName, bin]]
    : Object.entries(bin);

  const binDir = path.join(nodeModulesDir, '.bin');

  for (const [binName, relTarget] of entries) {
    if (!relTarget) continue;
    const targetScript = path.join(depSourceDir, relTarget);
    if (!fs.existsSync(targetScript)) continue;

    fs.mkdirSync(binDir, { recursive: true });
    const linkPath = path.join(binDir, process.platform === 'win32' ? `${binName}.cmd` : binName);

    try {
      if (process.platform === 'win32') {
        const relFromBin = path.relative(binDir, targetScript).replace(/\\/g, '\\');
        fs.writeFileSync(linkPath, `@echo off\r\nnode "%~dp0\\${relFromBin}" %*\r\n`, 'utf-8');
      } else {
        if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
        fs.symlinkSync(targetScript, linkPath);
        fs.chmodSync(linkPath, 0o755);
      }
    } catch {
      // best-effort — a missing .bin entry surfaces as "command not found" later
    }
  }
}

function linkNestedDependency(packageDir, depName, depSourceDir) {
  const nodeModulesDir = path.join(packageDir, 'node_modules');
  const targetDir = path.join(nodeModulesDir, depName);

  if (fs.existsSync(targetDir)) {
    linkBinEntries(nodeModulesDir, depName, targetDir);
    return;
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  const linkMode = config.get('linkMode') || 'junction';

  try {
    switch (linkMode) {
      case 'symlink':
        fs.symlinkSync(depSourceDir, targetDir, 'dir');
        break;
      case 'junction':
        if (process.platform === 'win32') {
          fs.symlinkSync(depSourceDir, targetDir, 'junction');
        } else {
          fs.symlinkSync(depSourceDir, targetDir, 'dir');
        }
        break;
      case 'hardlink':
        linkDirectoryHardlink(depSourceDir, targetDir);
        break;
      case 'copy':
      default:
        copyRecursive(depSourceDir, targetDir);
        break;
    }
  } catch {
    try {
      copyRecursive(depSourceDir, targetDir);
    } catch {
      // leave unlinked; require() will fail loudly for this dependency
    }
  }

  linkBinEntries(nodeModulesDir, depName, targetDir);
}

function linkPackageDependencies(store, packageName, packageVersion, dependencies, dependencyRealNames) {
  const packageDir = path.join(store.getPackageDir(packageName, packageVersion), 'package');
  if (!fs.existsSync(packageDir)) return;

  for (const [depName, depVersion] of Object.entries(dependencies || {})) {
    const storeName = dependencyRealNames?.[depName] || depName;
    if (!store.packageExists(storeName, depVersion)) continue;
    const depSourceDir = path.join(store.getPackageDir(storeName, depVersion), 'package');
    linkNestedDependency(packageDir, depName, depSourceDir);
  }
}

module.exports = {
  linkPackage,
  unlinkPackage,
  isLinked,
  copyRecursive,
  readManifest,
  getManifestPath,
  linkPackageDependencies
};
