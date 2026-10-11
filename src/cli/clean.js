const store = require('../store/store');
const project = require('../project/project');
const registry = require('../store/registry');
const lockfile = require('../store/lockfile');

function getUsedPackages(projectDirs) {
  const used = new Set();

  for (const projectDir of projectDirs) {
    const lock = lockfile.readLockFile(projectDir);
    if (lock?.packages) {
      for (const key of Object.keys(lock.packages)) {
        used.add(key);
      }
      continue;
    }

    const deps = project.getDependencies(projectDir);
    for (const [name, version] of Object.entries(deps)) {
      const cleanVersion = version.replace(/^[~^>=<]*/, '');
      used.add(`${name}@${cleanVersion}`);
    }
  }

  return used;
}

function garbageCollect(projectDirs) {
  const packages = store.listPackages();
  const used = getUsedPackages(projectDirs);

  let removed = 0;
  let kept = 0;

  for (const { name, version } of packages) {
    const key = `${name}@${version}`;
    if (used.has(key)) {
      kept++;
    } else {
      console.log(`[NxNode] Removing unused: ${name}@${version}`);
      store.removePackage(name, version);
      removed++;
    }
  }

  return { removed, kept };
}

function clean() {
  const projects = registry.listProjects();

  if (projects.length === 0) {
    console.log('[NxNode] Warning: No known projects registered. Run "nxnode install" in a project first.');
    console.log('[NxNode] Skipping cleanup to avoid removing packages that may still be in use.');
    return;
  }

  console.log(`[NxNode] Checking ${projects.length} known project(s)...`);
  for (const p of projects) {
    console.log(`  - ${p}`);
  }

  const { removed, kept } = garbageCollect(projects);

  console.log(`\n✓ Cleanup complete:`);
  console.log(`  Removed: ${removed} packages`);
  console.log(`  Kept: ${kept} packages`);
}

module.exports = { clean, getUsedPackages, garbageCollect };
