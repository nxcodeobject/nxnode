const store = require('../store/store');
const linker = require('../linker/linker');
const project = require('../project/project');
const resolver = require('../resolver/resolver');
const lockfile = require('../store/lockfile');

// Resolve the concrete version to link for a dependency. Prefer the version
// recorded in nxnode.lock (that is what was actually installed); fall back to
// real semver resolution against the registry, then to stripping any range
// operator as a last resort. Never link a bare range string like "^1.2.3".
async function resolveLinkVersion(root, name, versionSpec) {
  const lock = lockfile.readLockFile(root);
  const lockedKey = lock?.packages && Object.keys(lock.packages).find(k => k.startsWith(`${name}@`));
  if (lockedKey) {
    const lockedVersion = lock.packages[lockedKey].version;
    if (lockedVersion) return lockedVersion;
  }

  try {
    return await resolver.resolveVersion(name, versionSpec);
  } catch {
    return versionSpec.replace(/^[~^>=<]*/, '');
  }
}

async function link(projectDir) {
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
    const resolvedVersion = await resolveLinkVersion(root, name, version);
    const storePackageDir = store.getPackageDir(name, resolvedVersion);

    if (store.packageExists(name, resolvedVersion)) {
      linker.linkPackage(root, name, resolvedVersion, storePackageDir);
      linked++;
    } else {
      console.log(`[NxNode] ${name}@${resolvedVersion} not found in store`);
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
