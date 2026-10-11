const store = require('../store/store');
const linker = require('../linker/linker');
const project = require('../project/project');
const resolver = require('../resolver/resolver');
const lockfile = require('../store/lockfile');
const { downloadAndStore } = require('./install');

async function update(packageName, projectDir) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found.');
  }

  const pkgJson = project.readPackageJson(root);
  if (!pkgJson?.dependencies?.[packageName]) {
    throw new Error(`${packageName} is not a dependency in this project.`);
  }

  console.log(`[NxNode] Updating ${packageName}...`);

  const oldLock = lockfile.readLockFile(root);
  const oldLockKey = oldLock?.packages && Object.keys(oldLock.packages).find(k => k.startsWith(`${packageName}@`));
  const oldVersion = oldLockKey && oldLock.packages[oldLockKey].version;

  linker.unlinkPackage(root, packageName);

  const versionSpec = pkgJson.dependencies[packageName];
  const newVersion = await resolver.resolveVersion(packageName, versionSpec);

  if (oldVersion && oldVersion === newVersion) {
    console.log(`[NxNode] ${packageName}@${newVersion} is already up to date`);
    linker.linkPackage(root, packageName, newVersion, store.getPackageDir(packageName, newVersion));
    return;
  }

  if (!store.packageExists(packageName, newVersion)) {
    console.log(`[NxNode] Downloading ${packageName}@${newVersion}...`);
    await downloadAndStore(packageName, newVersion);
  }

  const storePackageDir = store.getPackageDir(packageName, newVersion);
  linker.linkPackage(root, packageName, newVersion, storePackageDir);

  lockfile.removeFromLock(root, packageName);

  console.log(`\u2713 ${packageName} updated to ${newVersion}`);
}

module.exports = { update };
