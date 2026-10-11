const store = require('../store/store');
const registry = require('../store/registry');

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

module.exports = { showPath, showStoreInfo, showProjects };
