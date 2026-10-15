const fs = require('fs');
const provenance = require('../provenance');
const osv = require('../provenance/osv');
const exporter = require('../provenance/export');
const dataset = require('../provenance/dataset');

function formatLicense(license) {
  const declared = license.declared || 'UNKNOWN';
  const detected = license.detected || 'UNKNOWN';
  let marker = '';
  if (license.mismatch) marker = '  [MISMATCH: declared != detected]';
  return `declared=${declared} detected=${detected}${marker}`;
}

function parseArgs(argv) {
  const opts = { packageName: null, exportFormat: null, out: null, dataset: null, osv: false, quality: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--osv') {
      opts.osv = true;
    } else if (arg === '--quality') {
      opts.quality = true;
    } else if (arg === '--export') {
      opts.exportFormat = argv[++i] || null;
    } else if (arg === '--out') {
      opts.out = argv[++i] || null;
    } else if (arg === '--dataset') {
      opts.dataset = argv[++i] || null;
    } else if (!arg.startsWith('--')) {
      opts.packageName = arg;
    }
  }
  return opts;
}

async function attachOsv(entries) {
  const query = entries.map((e) => ({ name: e.name, version: e.version }));
  const { ok, results } = await osv.queryBatchSafe(query, (err) => {
    console.log(`[NxNode] Warning: OSV query failed (${err.message}); continuing without vulnerability data.`);
  });
  if (!ok) return false;

  for (const entry of entries) {
    entry.vulnerabilities = results.get(`${entry.name}@${entry.version}`) || [];
  }
  return true;
}

function emitExport(entries, format, out) {
  const doc = exporter.build(format, entries, { name: 'nxnode-store' });
  const json = JSON.stringify(doc, null, 2);
  if (out) {
    fs.writeFileSync(out, json, 'utf-8');
    console.log(`[NxNode] Wrote ${format} SBOM to ${out} (${entries.length} packages)`);
  } else {
    console.log(json);
  }
}

function formatQuality(quality, verbose) {
  const flags = [];
  if (quality.deprecated) flags.push('DEPRECATED');
  if (quality.npmScripts.length > 0) flags.push(`install-scripts: ${quality.npmScripts.join(',')}`);
  if (!quality.hasLicenseFile) flags.push('no LICENSE file');
  const head = `readme=${quality.hasReadme} repository=${quality.hasRepository} deps=${quality.dependencyCount} scripts=${quality.scriptCount}`;
  const tail = flags.length > 0 ? `  [${flags.join('; ')}]` : '';
  if (!verbose) return head + tail;
  const lines = [
    `    readme:       ${quality.hasReadme}`,
    `    license file: ${quality.hasLicenseFile}`,
    `    repository:   ${quality.hasRepository}`,
    `    description:  ${quality.hasDescription}`,
    `    keywords:     ${quality.hasKeywords}`,
    `    dependencies: ${quality.dependencyCount}`,
    `    scripts:      ${quality.scriptCount}`,
    `    deprecated:   ${quality.deprecated}`,
    `    integrity:    ${quality.integrityVerified}`,
    `    install scripts: ${quality.npmScripts.length > 0 ? quality.npmScripts.join(', ') : 'none'}`
  ];
  return head + tail + '\n' + lines.join('\n');
}

async function showProvenance(argv = []) {
  const opts = parseArgs(argv);
  const entries = provenance.listProvenance(opts.packageName || undefined);

  if (entries.length === 0) {
    if (opts.packageName) {
      console.log(`[NxNode] ${opts.packageName} not found in store`);
    } else {
      console.log('[NxNode] Store is empty');
    }
    return;
  }

  if (opts.osv) {
    await attachOsv(entries);
  }

  if (opts.dataset) {
    const result = dataset.writeDataset(entries, opts.dataset);
    console.log(`[NxNode] Wrote open dataset to ${opts.dataset} (${result.packages} package${result.packages === 1 ? '' : 's'})`);
    return;
  }

  if (opts.exportFormat) {
    emitExport(entries, opts.exportFormat, opts.out);
    return;
  }

  console.log(`[NxNode] Provenance (${entries.length} package${entries.length === 1 ? '' : 's'}):`);
  for (const p of entries) {
    console.log(`\n  ${p.name}@${p.version}`);
    console.log(`    origin:  ${p.origin.source}${p.origin.tarball ? ` (${p.origin.tarball})` : ''}`);
    console.log(`    integrity: ${p.origin.integrity || 'unknown'}`);
    console.log(`    license: ${formatLicense(p.license)}`);
    if (p.quality) {
      console.log(`    quality: ${formatQuality(p.quality, opts.quality)}`);
    }
    if (p.vulnerabilities) {
      if (p.vulnerabilities.length === 0) {
        console.log('    vulns:   none known');
      } else {
        console.log(`    vulns:   ${p.vulnerabilities.map((v) => v.id).join(', ')}`);
      }
    }
  }
}

module.exports = { showProvenance, parseArgs };
