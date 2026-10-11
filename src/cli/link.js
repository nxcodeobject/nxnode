const store = require('../store/store');
const linker = require('../linker/linker');
const project = require('../project/project');

function link(projectDir) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found.');
  }

  const deps = project.getDependencies(root);
  const entries = Object.entries(deps);

  if (entries.length === 0) {
    console.log('[NxNode] No dependencies to link');
    return;
  }

  console.log('[NxNode] Linking all dependencies...');
  let linked = 0;

  for (const [name, version] of entries) {
    const cleanVersion = version.replace(/^[~^>=<]*/, '');
    const storePackageDir = store.getPackageDir(name, cleanVersion);
    
    if (store.packageExists(name, cleanVersion)) {
      linker.linkPackage(root, name, cleanVersion, storePackageDir);
      linked++;
    } else {
      console.log(`[NxNode] ${name}@${cleanVersion} not found in store`);
    }
  }

  console.log(`\u2713 Linked ${linked} packages`);
}

function unlink(projectDir) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found.');
  }

  const deps = project.getDependencies(root);
  const entries = Object.entries(deps);

  if (entries.length === 0) {
    console.log('[NxNode] No dependencies to unlink');
    return;
  }

  console.log('[NxNode] Unlinking all dependencies...');
  let unlinked = 0;

  for (const [name] of entries) {
    if (linker.unlinkPackage(root, name)) {
      unlinked++;
    }
  }

  console.log(`\u2713 Unlinked ${unlinked} packages`);
}

module.exports = { link, unlink };
