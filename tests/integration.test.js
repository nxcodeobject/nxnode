const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// fs.existsSync (stat-based) follows symlinks/junctions and can fail on some
// Windows setups, reporting a valid link as missing. Tests must use lstat.
function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

describe('Integration: Install Flow', () => {
  const testDir = path.join(os.tmpdir(), 'nxnode-integration-test');
  const storeDir = path.join(testDir, 'store');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(storeDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create project', () => {
    const project = require('../src/project/project');
    const projectDir = path.join(testDir, 'my-project');
    
    project.createProject(projectDir, 'my-project');
    
    assert.ok(fs.existsSync(path.join(projectDir, 'package.json')));
    const pkg = project.readPackageJson(projectDir);
    assert.strictEqual(pkg.name, 'my-project');
  });

  it('should add and remove dependency', () => {
    const project = require('../src/project/project');
    const projectDir = path.join(testDir, 'dep-test');
    
    fs.mkdirSync(projectDir, { recursive: true });
    project.writePackageJson(projectDir, { name: 'test', dependencies: {} });
    
    project.addDependency(projectDir, 'lodash', '^4.17.0');
    let pkg = project.readPackageJson(projectDir);
    assert.strictEqual(pkg.dependencies.lodash, '^4.17.0');
    
    project.removeDependency(projectDir, 'lodash');
    pkg = project.readPackageJson(projectDir);
    assert.strictEqual(pkg.dependencies.lodash, undefined);
  });
});

describe('Integration: Linker', () => {
  const testDir = path.join(os.tmpdir(), 'nxnode-linker-test');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create junction on Windows', () => {
    const linker = require('../src/linker/linker');
    const storeDir = path.join(testDir, 'store', 'test-pkg', '1.0.0');
    const sourceDir = path.join(storeDir, 'package');
    const projectDir = path.join(testDir, 'project');
    
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.js'), 'module.exports = {};');
    fs.mkdirSync(projectDir, { recursive: true });
    
    const result = linker.linkPackage(projectDir, 'test-pkg', '1.0.0', storeDir);
    
    const linkedPath = path.join(projectDir, 'node_modules', 'test-pkg');
    assert.ok(pathExists(linkedPath));
  });

  it('should unlink package', () => {
    const linker = require('../src/linker/linker');
    const storeDir = path.join(testDir, 'store', 'test-pkg', '1.0.0');
    const sourceDir = path.join(storeDir, 'package');
    const projectDir = path.join(testDir, 'project');
    
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'index.js'), 'module.exports = {};');
    fs.mkdirSync(projectDir, { recursive: true });
    
    linker.linkPackage(projectDir, 'test-pkg', '1.0.0', storeDir);
    assert.ok(pathExists(path.join(projectDir, 'node_modules', 'test-pkg')));
    
    linker.unlinkPackage(projectDir, 'test-pkg');
    assert.ok(!pathExists(path.join(projectDir, 'node_modules', 'test-pkg')));
  });
});

describe('Integration: Lockfile', () => {
  const testDir = path.join(os.tmpdir(), 'nxnode-lockfile-test');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should write and read lockfile', () => {
    const lockfile = require('../src/store/lockfile');
    
    const data = {
      lockfileVersion: 1,
      packages: {
        'lodash@4.17.21': { version: '4.17.21', integrity: 'sha1-...' }
      }
    };
    
    lockfile.writeLockFile(testDir, data);
    const read = lockfile.readLockFile(testDir);
    
    assert.deepStrictEqual(read, data);
  });

  it('should check if package is locked', () => {
    const lockfile = require('../src/store/lockfile');
    
    const data = {
      lockfileVersion: 1,
      packages: {
        'lodash@4.17.21': { version: '4.17.21' }
      }
    };
    
    lockfile.writeLockFile(testDir, data);
    
    assert.ok(lockfile.isLocked(testDir, 'lodash', '4.17.21'));
    assert.ok(!lockfile.isLocked(testDir, 'lodash', '4.18.0'));
  });
});
