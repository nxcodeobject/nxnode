const fs = require('fs');
const path = require('path');

function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

function readPackageJson(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

function writePackageJson(projectDir, pkg) {
  const pkgPath = path.join(projectDir, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
}

function addDependency(projectDir, name, version) {
  const pkg = readPackageJson(projectDir);
  if (!pkg) throw new Error('No package.json found');
  if (!pkg.dependencies) pkg.dependencies = {};
  pkg.dependencies[name] = version;
  writePackageJson(projectDir, pkg);
  return pkg;
}

function removeDependency(projectDir, name) {
  const pkg = readPackageJson(projectDir);
  if (!pkg || !pkg.dependencies) return pkg;
  delete pkg.dependencies[name];
  writePackageJson(projectDir, pkg);
  return pkg;
}

function getDependencies(projectDir) {
  const pkg = readPackageJson(projectDir);
  if (!pkg) return {};
  return pkg.dependencies || {};
}

function createProject(projectDir, name) {
  const pkg = {
    name,
    version: '1.0.0',
    description: '',
    main: 'index.js',
    scripts: {
      start: 'node index.js'
    },
    dependencies: {}
  };
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  writePackageJson(projectDir, pkg);
  return pkg;
}

module.exports = { findProjectRoot, readPackageJson, writePackageJson, addDependency, removeDependency, getDependencies, createProject };
