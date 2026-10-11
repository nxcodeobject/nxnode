const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Config', () => {
  const testHomeDir = path.join(os.tmpdir(), 'nxnode-test-home');
  const originalHomedir = os.homedir;

  beforeEach(() => {
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testHomeDir, { recursive: true });
    os.homedir = () => testHomeDir;
    delete require.cache[require.resolve('../src/config/config')];
  });

  afterEach(() => {
    os.homedir = originalHomedir;
    fs.rmSync(testHomeDir, { recursive: true, force: true });
    delete require.cache[require.resolve('../src/config/config')];
  });

  it('should load default config', () => {
    const config = require('../src/config/config');
    const cfg = config.load();
    assert.ok(cfg.storePath);
    assert.ok(cfg.linkMode);
  });

  it('should set and get config', () => {
    const config = require('../src/config/config');
    config.set('storePath', '/test/path');
    const val = config.get('storePath');
    assert.strictEqual(val, '/test/path');
    assert.ok(config.CONFIG_FILE.startsWith(testHomeDir));
  });
});

describe('Semver', () => {
  const semver = require('../src/resolver/semver');

  it('should parse version', () => {
    const v = semver.parse('1.2.3');
    assert.deepStrictEqual(v, { major: 1, minor: 2, patch: 3 });
  });

  it('should clean version', () => {
    assert.strictEqual(semver.clean('^1.2.3'), '1.2.3');
    assert.strictEqual(semver.clean('~1.2.3'), '1.2.3');
    assert.strictEqual(semver.clean('>=1.2.3'), '1.2.3');
  });

  it('should check satisfies', () => {
    assert.ok(semver.satisfies('1.2.3', { operator: '^', version: { major: 1, minor: 2, patch: 0 } }));
    assert.ok(!semver.satisfies('2.0.0', { operator: '^', version: { major: 1, minor: 2, patch: 0 } }));
    assert.ok(semver.satisfies('1.2.3', { operator: '~', version: { major: 1, minor: 2, patch: 0 } }));
    assert.ok(!semver.satisfies('1.3.0', { operator: '~', version: { major: 1, minor: 2, patch: 0 } }));
  });

  it('should compare versions', () => {
    assert.ok(semver.gt('2.0.0', '1.0.0'));
    assert.ok(semver.lt('1.0.0', '2.0.0'));
    assert.ok(!semver.gt('1.0.0', '1.0.0'));
  });

  it('should parse partial versions', () => {
    assert.deepStrictEqual(semver.parse('1'), { major: 1, minor: 0, patch: 0 });
    assert.deepStrictEqual(semver.parse('1.4'), { major: 1, minor: 4, patch: 0 });
    assert.strictEqual(semver.parse('not-a-version'), null);
  });

  it('should treat bare major/minor version spec as caret range', () => {
    const range = semver.parseRange('1');
    assert.strictEqual(range.operator, '^');
    assert.ok(semver.satisfies('1.0.2', range));
    assert.ok(semver.satisfies('1.9.9', range));
    assert.ok(!semver.satisfies('2.0.0', range));
  });
});

describe('Integrity', () => {
  const integrity = require('../src/store/integrity');

  it('should compute integrity', () => {
    const data = Buffer.from('test data');
    const hash = integrity.computeIntegrity(data);
    assert.ok(hash.startsWith('sha512-'));
  });

  it('should verify integrity', () => {
    const data = Buffer.from('test data');
    const hash = integrity.computeIntegrity(data);
    assert.ok(integrity.verifyIntegrity(data, hash));
    assert.ok(!integrity.verifyIntegrity(Buffer.from('wrong data'), hash));
  });
});

describe('Install package argument parsing', () => {
  const { parsePackageArg } = require('../src/cli/install');

  it('should parse plain package name without version', () => {
    assert.deepStrictEqual(parsePackageArg('express'), { packageName: 'express', requestedVersion: null });
  });

  it('should parse package name with version', () => {
    assert.deepStrictEqual(parsePackageArg('express@5.1.0'), { packageName: 'express', requestedVersion: '5.1.0' });
    assert.deepStrictEqual(parsePackageArg('adm-zip@^0.5.17'), { packageName: 'adm-zip', requestedVersion: '^0.5.17' });
  });

  it('should parse scoped package without version', () => {
    assert.deepStrictEqual(parsePackageArg('@xterm/xterm'), { packageName: '@xterm/xterm', requestedVersion: null });
  });

  it('should parse scoped package with version', () => {
    assert.deepStrictEqual(parsePackageArg('@xterm/xterm@5.5.0'), { packageName: '@xterm/xterm', requestedVersion: '5.5.0' });
  });
});

describe('Store', () => {
  const store = require('../src/store/store');
  const testStoreDir = path.join(os.tmpdir(), 'nxnode-test-store');

  beforeEach(() => {
    if (fs.existsSync(testStoreDir)) {
      fs.rmSync(testStoreDir, { recursive: true, force: true });
    }
  });

  it('should check package exists', () => {
    assert.strictEqual(store.packageExists('test-pkg', '1.0.0'), false);
  });

  it('should list packages', () => {
    const packages = store.listPackages();
    assert.ok(Array.isArray(packages));
  });
});
