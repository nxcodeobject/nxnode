const linker = require('../linker/linker');
const project = require('../project/project');

async function remove(packageName, projectDir) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found.');
  }

  console.log(`[NxNode] Removing ${packageName}...`);

  const removed = linker.unlinkPackage(root, packageName);
  if (!removed) {
    console.log(`[NxNode] ${packageName} not linked in this project`);
    return;
  }

  project.removeDependency(root, packageName);
  console.log(`\u2713 ${packageName} removed`);
}

module.exports = { remove };
