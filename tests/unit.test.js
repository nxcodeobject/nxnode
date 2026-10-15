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

describe('License detection', () => {
  const license = require('../src/provenance/license');

  it('should normalize common license aliases to SPDX', () => {
    assert.strictEqual(license.normalizeLicense('MIT'), 'MIT');
    assert.strictEqual(license.normalizeLicense('Apache 2.0'), 'Apache-2.0');
    assert.strictEqual(license.normalizeLicense('BSD'), 'BSD-3-Clause');
    assert.strictEqual(license.normalizeLicense('GPLv3'), 'GPL-3.0-only');
  });

  it('should return null for unknown license without guessing', () => {
    assert.strictEqual(license.normalizeLicense('SomeCustomLicense'), null);
    assert.strictEqual(license.normalizeLicense(''), null);
    assert.strictEqual(license.normalizeLicense(null), null);
  });

  it('should handle SPDX compound expressions', () => {
    assert.strictEqual(license.normalizeLicense('MIT OR Apache-2.0'), 'MIT OR Apache-2.0');
  });

  it('should read declared license from package.json forms', () => {
    assert.strictEqual(license.getDeclaredLicense({ license: 'MIT' }), 'MIT');
    assert.strictEqual(license.getDeclaredLicense({ license: { type: 'ISC' } }), 'ISC');
    assert.strictEqual(
      license.getDeclaredLicense({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }),
      'MIT OR Apache-2.0'
    );
    assert.strictEqual(license.getDeclaredLicense({}), null);
  });

  it('should detect license from LICENSE file text', () => {
    assert.strictEqual(
      license.detectLicenseFromText('MIT License\n\nPermission is hereby granted, free of charge...'),
      'MIT'
    );
    assert.strictEqual(
      license.detectLicenseFromText('Licensed under the Apache License, Version 2.0'),
      'Apache-2.0'
    );
    assert.strictEqual(license.detectLicenseFromText('all rights reserved'), null);
  });
});

describe('Provenance export', () => {
  const exporter = require('../src/provenance/export');

  const entries = [
    {
      name: 'express',
      version: '5.1.0',
      origin: {
        source: 'npm',
        tarball: 'https://registry.npmjs.org/express/-/express-5.1.0.tgz',
        integrity: 'sha512-abc123'
      },
      license: { declared: 'MIT', detected: 'MIT', mismatch: false }
    }
  ];

  it('should build a valid SPDX 2.3 document', () => {
    const doc = exporter.buildSpdx(entries, { now: '2026-01-01T00:00:00Z' });
    assert.strictEqual(doc.spdxVersion, 'SPDX-2.3');
    assert.strictEqual(doc.packages.length, 1);
    assert.strictEqual(doc.packages[0].name, 'express');
    assert.strictEqual(doc.packages[0].licenseDeclared, 'MIT');
    assert.strictEqual(doc.packages[0].downloadLocation, entries[0].origin.tarball);
  });

  it('should build a valid CycloneDX 1.5 document', () => {
    const doc = exporter.buildCycloneDx(entries, { now: '2026-01-01T00:00:00Z' });
    assert.strictEqual(doc.bomFormat, 'CycloneDX');
    assert.strictEqual(doc.specVersion, '1.5');
    assert.strictEqual(doc.components.length, 1);
    assert.strictEqual(doc.components[0].purl, 'pkg:npm/express@5.1.0');
    assert.deepStrictEqual(doc.components[0].licenses, [{ license: { id: 'MIT' } }]);
  });

  it('should build purl for scoped packages', () => {
    assert.strictEqual(exporter.purlFor('@scope/name', '1.0.0'), 'pkg:npm/%40scope/name@1.0.0');
  });

  it('should throw on unknown format', () => {
    assert.throws(() => exporter.build('nope', entries), /Unknown export format/);
  });
});

describe('Provenance CLI arg parsing', () => {
  const { parseArgs } = require('../src/cli/provenance');

  it('should parse package name only', () => {
    assert.deepStrictEqual(parseArgs(['express']), {
      packageName: 'express',
      exportFormat: null,
      out: null,
      dataset: null,
      osv: false,
      quality: false
    });
  });

  it('should parse --export and --out flags', () => {
    assert.deepStrictEqual(parseArgs(['--export', 'spdx', '--out', 'sbom.json']), {
      packageName: null,
      exportFormat: 'spdx',
      out: 'sbom.json',
      dataset: null,
      osv: false,
      quality: false
    });
  });

  it('should parse --osv flag with package', () => {
    assert.deepStrictEqual(parseArgs(['express', '--osv']), {
      packageName: 'express',
      exportFormat: null,
      out: null,
      dataset: null,
      osv: true,
      quality: false
    });
  });

  it('should parse --quality flag', () => {
    assert.deepStrictEqual(parseArgs(['express', '--quality']), {
      packageName: 'express',
      exportFormat: null,
      out: null,
      dataset: null,
      osv: false,
      quality: true
    });
  });

  it('should parse --dataset flag', () => {
    assert.deepStrictEqual(parseArgs(['--dataset', 'out/dir']), {
      packageName: null,
      exportFormat: null,
      out: null,
      dataset: 'out/dir',
      osv: false,
      quality: false
    });
  });
});

describe('Registry fetch resilience', () => {
  const npm = require('../src/registry/npm');
  const http = require('http');

  it('should parse Retry-After seconds and HTTP-date', () => {
    assert.strictEqual(npm.parseRetryAfter('2'), 2000);
    assert.strictEqual(npm.parseRetryAfter(undefined), null);
    assert.strictEqual(npm.parseRetryAfter('garbage'), null);
    const future = new Date(Date.now() + 3000).toUTCString();
    const ms = npm.parseRetryAfter(future);
    assert.ok(ms > 0 && ms <= 3000);
  });

  it('should back off exponentially and cap', () => {
    assert.strictEqual(npm.backoffMs(0, null), 200);
    assert.strictEqual(npm.backoffMs(1, null), 400);
    assert.strictEqual(npm.backoffMs(10, null), 5000);
    assert.strictEqual(npm.backoffMs(0, 1234), 1234);
  });

  it('should retry transient failures and then succeed', async () => {
    let calls = 0;
    const server = http.createServer((req, res) => {
      calls++;
      if (calls < 3) {
        res.writeHead(503);
        res.end('busy');
      } else {
        res.writeHead(200);
        res.end('ok');
      }
    });
    await new Promise((r) => server.listen(0, r));
    const url = `http://127.0.0.1:${server.address().port}/`;

    try {
      const body = await npm.request(url, { retries: 5 });
      assert.strictEqual(body.toString(), 'ok');
      assert.strictEqual(calls, 3);
    } finally {
      server.close();
    }
  });

  it('should not retry non-retryable status (404)', async () => {
    let calls = 0;
    const server = http.createServer((req, res) => {
      calls++;
      res.writeHead(404);
      res.end('nope');
    });
    await new Promise((r) => server.listen(0, r));
    const url = `http://127.0.0.1:${server.address().port}/`;

    try {
      await assert.rejects(() => npm.request(url, { retries: 5 }), /HTTP 404/);
      assert.strictEqual(calls, 1);
    } finally {
      server.close();
    }
  });

  it('should follow redirects', async () => {
    const server = http.createServer((req, res) => {
      if (req.url === '/from') {
        res.writeHead(302, { Location: '/to' });
        res.end();
      } else {
        res.writeHead(200);
        res.end('arrived');
      }
    });
    await new Promise((r) => server.listen(0, r));
    const base = `http://127.0.0.1:${server.address().port}`;

    try {
      const body = await npm.request(`${base}/from`, { retries: 0 });
      assert.strictEqual(body.toString(), 'arrived');
    } finally {
      server.close();
    }
  });
});

describe('Open dataset', () => {
  const dataset = require('../src/provenance/dataset');
  const testDir = path.join(os.tmpdir(), 'nxnode-dataset-test');

  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  const entries = [
    {
      name: 'express',
      version: '5.1.0',
      origin: { source: 'npm', tarball: 'https://x/y.tgz', integrity: 'sha512-abc' },
      license: { declared: 'MIT', detected: 'MIT', mismatch: false },
      quality: { hasReadme: true }
    },
    {
      name: '@scope/name',
      version: '1.0.0',
      origin: { source: 'npm', tarball: null, integrity: 'sha512-def' },
      license: { declared: 'ISC', detected: null, mismatch: false },
      quality: { hasReadme: false }
    }
  ];

  it('should write one JSON file per package plus index', () => {
    const result = dataset.writeDataset(entries, testDir, { now: '2026-01-01T00:00:00Z' });

    assert.strictEqual(result.packages, 2);
    assert.ok(fs.existsSync(path.join(testDir, 'index.json')));
    assert.ok(fs.existsSync(path.join(testDir, 'packages', 'express', '5.1.0.json')));
    // scoped name encoded as a single folder
    assert.ok(fs.existsSync(path.join(testDir, 'packages', '@scope+name', '1.0.0.json')));
  });

  it('should write a schema-versioned index', () => {
    dataset.writeDataset(entries, testDir, { now: '2026-01-01T00:00:00Z' });
    const index = JSON.parse(fs.readFileSync(path.join(testDir, 'index.json'), 'utf-8'));

    assert.strictEqual(index.schemaVersion, dataset.SCHEMA_VERSION);
    assert.strictEqual(index.packageCount, 2);
    assert.strictEqual(index.packages[0].name, 'express');
    assert.strictEqual(index.packages[0].license, 'MIT');
  });
});

describe('Store dedup', () => {
  const dedup = require('../src/store/dedup');
  const testDir = path.join(os.tmpdir(), 'nxnode-dedup-test');
  const storeDir = path.join(testDir, 'store');

  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should hardlink identical files across packages', () => {
    const a = path.join(testDir, 'a');
    const b = path.join(testDir, 'b');
    fs.mkdirSync(a, { recursive: true });
    fs.mkdirSync(b, { recursive: true });
    fs.writeFileSync(path.join(a, 'LICENSE'), 'same content');
    fs.writeFileSync(path.join(b, 'LICENSE'), 'same content');

    const index = dedup.readIndex(storeDir);
    dedup.dedupDirectory(a, storeDir, { index });
    const stats = dedup.dedupDirectory(b, storeDir, { index });

    assert.strictEqual(stats.linked, 1);
    // hardlinked files share the same link count
    assert.strictEqual(fs.statSync(path.join(a, 'LICENSE')).nlink, 2);
    // and changing one is visible from the other (same inode)
    fs.writeFileSync(path.join(a, 'LICENSE'), 'changed');
    assert.strictEqual(fs.readFileSync(path.join(b, 'LICENSE'), 'utf-8'), 'changed');
  });

  it('should keep distinct content as separate files', () => {
    const a = path.join(testDir, 'a');
    fs.mkdirSync(a, { recursive: true });
    fs.writeFileSync(path.join(a, 'x'), 'one');
    fs.writeFileSync(path.join(a, 'y'), 'two');

    const stats = dedup.dedupDirectory(a, storeDir);
    assert.strictEqual(stats.written, 2);
    assert.strictEqual(stats.linked, 0);
  });

  it('should persist the hash index', () => {
    const a = path.join(testDir, 'a');
    fs.mkdirSync(a, { recursive: true });
    fs.writeFileSync(path.join(a, 'f'), 'content');

    dedup.dedupDirectory(a, storeDir);
    const index = dedup.readIndex(storeDir);
    assert.strictEqual(Object.keys(index).length, 1);
  });
});

describe('Quality signals', () => {
  const quality = require('../src/provenance/quality');
  const testDir = path.join(os.tmpdir(), 'nxnode-quality-test');

  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect readme and license files', () => {
    fs.writeFileSync(path.join(testDir, 'README.md'), '# hi');
    fs.writeFileSync(path.join(testDir, 'LICENSE'), 'MIT');
    const q = quality.computeQuality(testDir, {}, { integrity: 'sha512-x' });
    assert.strictEqual(q.hasReadme, true);
    assert.strictEqual(q.hasLicenseFile, true);
    assert.strictEqual(q.integrityVerified, true);
  });

  it('should report missing files as false', () => {
    const q = quality.computeQuality(testDir, {}, {});
    assert.strictEqual(q.hasReadme, false);
    assert.strictEqual(q.hasLicenseFile, false);
    assert.strictEqual(q.integrityVerified, false);
  });

  it('should compute counts and flags from package.json', () => {
    const pkg = {
      description: 'a lib',
      keywords: ['a', 'b'],
      repository: 'https://example.com',
      deprecated: 'use v2',
      dependencies: { a: '1.0.0', b: '2.0.0' },
      scripts: { test: 'x', postinstall: 'y', preinstall: 'z' }
    };
    const q = quality.computeQuality(testDir, pkg, {});
    assert.strictEqual(q.hasDescription, true);
    assert.strictEqual(q.hasKeywords, true);
    assert.strictEqual(q.hasRepository, true);
    assert.strictEqual(q.deprecated, true);
    assert.strictEqual(q.dependencyCount, 2);
    assert.strictEqual(q.scriptCount, 3);
    assert.deepStrictEqual(q.npmScripts, ['preinstall', 'postinstall']);
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
