const fs = require('fs');
const path = require('path');
const store = require('../store/store');
const registry = require('../store/registry');
const dedup = require('../store/dedup');

function showPath() {
  console.log(store.getStorePath());
}

function showStoreInfo() {
  const packages = store.listPackages();
  console.log(`[NxNode] Store location: ${store.getStorePath()}`);
  console.log(`[NxNode] Packages: ${packages.length}`);
}

function showProjects() {
  const projects = registry.listProjects();

  if (projects.length === 0) {
    console.log('[NxNode] No registered projects yet.');
    console.log('[NxNode] Run "nxnode install" or "nxnode project create" in a project to register it.');
    return;
  }

  console.log(`[NxNode] Registered projects (${projects.length}):`);
  for (const p of projects) {
    console.log(`  ${p}`);
  }
}

// Backfill dedup for packages already in the store. New installs dedup at
// extract time; this covers packages stored before dedup existed.
function dedupStore() {
  const storePath = store.getStorePath();
  const packages = store.listPackages();

  if (packages.length === 0) {
    console.log('[NxNode] Store is empty');
    return;
  }

  console.log(`[NxNode] Deduplicating ${packages.length} package(s)...`);
  const index = dedup.readIndex(storePath);
  const totals = { linked: 0, written: 0, skipped: 0 };

  for (const { name, version } of packages) {
    const packageDir = path.join(store.getPackageDir(name, version), 'package');
    if (!fs.existsSync(packageDir)) continue;
    const stats = dedup.dedupDirectory(packageDir, storePath, { index });
    totals.linked += stats.linked;
    totals.written += stats.written;
    totals.skipped += stats.skipped;
  }

  dedup.writeIndex(storePath, index);

  console.log('\u2713 Dedup complete:');
  console.log(`  Hardlinked: ${totals.linked} files`);
  console.log(`  Kept separate: ${totals.written} files`);
  console.log(`  Skipped: ${totals.skipped}`);
}

module.exports = { showPath, showStoreInfo, showProjects, dedupStore };
