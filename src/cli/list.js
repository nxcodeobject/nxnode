const store = require('../store/store');
const project = require('../project/project');
const linker = require('../linker/linker');

function listLocal(projectDir) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found.');
  }

  const deps = project.getDependencies(root);
  const entries = Object.entries(deps);

  if (entries.length === 0) {
    console.log('[NxNode] No dependencies installed');
    return;
  }

  const manifest = linker.readManifest(root);

  console.log('[NxNode] Local dependencies:');
  for (const [name, version] of entries) {
    const linkInfo = manifest[name];
    if (linkInfo) {
      const marker = linkInfo.linkMode === 'copy' ? 'copied' : `linked (${linkInfo.linkMode})`;
      console.log(`  ${name}@${version}  [${marker} -> ${linkInfo.storeSource}]`);
    } else {
      console.log(`  ${name}@${version}  [not linked yet]`);
    }
  }
}

function listGlobal() {
  const packages = store.listPackages();
  
  if (packages.length === 0) {
    console.log('[NxNode] Global store is empty');
    return;
  }

  console.log(`[NxNode] Global store (${store.getStorePath()}):`);
  for (const { name, version } of packages) {
    console.log(`  ${name}@${version}`);
  }
}

module.exports = { listLocal, listGlobal };
