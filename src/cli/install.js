const path = require('path');
const fs = require('fs');
const tar = require('tar');
const store = require('../store/store');
const integrity = require('../store/integrity');
const npm = require('../registry/npm');
const linker = require('../linker/linker');
const project = require('../project/project');
const resolver = require('../resolver/resolver');
const lockfile = require('../store/lockfile');
const registry = require('../store/registry');
const lifecycle = require('../store/lifecycle');
const { DependencyTree } = require('../resolver/dependency-tree');

async function downloadAndStore(packageName, version) {
  const metadata = await npm.getPackageMetadata(packageName, version);
  const tarballUrl = metadata.dist?.tarball;
  if (!tarballUrl) throw new Error('No tarball URL found');

  const tarball = await npm.fetchTarball(tarballUrl);

  const computedIntegrity = integrity.computeIntegrity(tarball);
  if (metadata.dist?.integrity && metadata.dist.integrity !== computedIntegrity) {
    throw new Error(`Integrity check failed for ${packageName}@${version}: expected ${metadata.dist.integrity}, got ${computedIntegrity}`);
  }

  const pkgDir = store.getPackageDir(packageName, version);
  const packageDir = path.join(pkgDir, 'package');

  if (!fs.existsSync(pkgDir)) {
    fs.mkdirSync(pkgDir, { recursive: true });
  }

  const tarPath = path.join(pkgDir, 'download.tgz');
  fs.writeFileSync(tarPath, tarball);

  await tar.extract({ file: tarPath, cwd: pkgDir });

  const extractedDir = path.join(pkgDir, `package-${version}`);
  if (fs.existsSync(extractedDir)) {
    if (fs.existsSync(packageDir)) fs.rmSync(packageDir, { recursive: true, force: true });
    fs.renameSync(extractedDir, packageDir);
  }

  fs.unlinkSync(tarPath);

  store.saveMetadata(packageName, version, {
    name: packageName,
    version,
    integrity: computedIntegrity,
    source: 'npm',
    installedAt: new Date().toISOString(),
    tarball: tarballUrl,
    license: metadata.license || null,
    licenses: metadata.licenses || null,
    dependencies: metadata.dependencies || {},
    scripts: metadata.scripts || {}
  });

  return computedIntegrity;
}

function parsePackageArg(arg) {
  const atIndex = arg.indexOf('@', 1);
  if (atIndex === -1) {
    return { packageName: arg, requestedVersion: null };
  }
  return {
    packageName: arg.slice(0, atIndex),
    requestedVersion: arg.slice(atIndex + 1)
  };
}

function isLocalOrGitSpec(versionSpec) {
  if (!versionSpec) return false;
  return /^(file:|link:|git\+|git:|github:|https?:\/\/)/.test(versionSpec);
}

function emit(onProgress, event) {
  if (onProgress) {
    onProgress(event);
  } else if (event.line) {
    console.log(event.line);
  }
}

async function install(packageArg, projectDir, onProgress, opts = {}) {
  const { packageName, requestedVersion } = parsePackageArg(packageArg);
  const runLifecycleScripts = Boolean(opts.runLifecycleScripts);

  if (isLocalOrGitSpec(requestedVersion)) {
    emit(onProgress, {
      type: 'skipped-local',
      packageName,
      line: `[NxNode] Skipping ${packageName} (${requestedVersion}): local/git dependencies are not managed by nxnode.`
    });
    return;
  }

  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found. Run this command in a project directory.');
  }

  const pkgJson = project.readPackageJson(root);
  const alreadyDeclared = Boolean(pkgJson?.dependencies?.[packageName]);
  const versionSpec = requestedVersion || pkgJson?.dependencies?.[packageName] || 'latest';

  emit(onProgress, { type: 'resolving', packageName, line: `[NxNode] Resolving ${packageName}...` });
  const version = await resolver.resolveVersion(packageName, versionSpec);
  emit(onProgress, { type: 'resolved', packageName, version, line: `[NxNode] Required version: ${version}` });

  if (!alreadyDeclared || requestedVersion) {
    project.addDependency(root, packageName, `^${version}`);
    emit(onProgress, {
      type: 'package-json-updated',
      packageName,
      version,
      line: `[NxNode] ${alreadyDeclared ? 'Updated' : 'Added'} ${packageName}@^${version} in package.json`
    });
  }

  store.ensureStore();

  emit(onProgress, { type: 'resolving-tree', line: '[NxNode] Building dependency tree...' });
  const tree = new DependencyTree();
  await tree.build(packageName, versionSpec);

  if (tree.hasConflicts()) {
    emit(onProgress, { type: 'conflicts', conflicts: tree.getConflicts(), line: '[NxNode] Warning: Multiple versions of the same package are required:' });
    for (const conflict of tree.getConflicts()) {
      emit(onProgress, { type: 'conflict-detail', conflict, line: `  ${conflict.package}: ${conflict.versions.join(', ')}` });
    }
    emit(onProgress, { type: 'conflicts-note', line: '[NxNode] Each version will be stored and linked independently (see README §8).' });
  }

  const allDeps = tree.getAll();
  emit(onProgress, { type: 'tree-resolved', count: allDeps.length, line: `[NxNode] Found ${allDeps.length} packages` });

  for (const dep of allDeps) {
    const storeName = dep.resolvedName || dep.name;
    if (store.packageExists(storeName, dep.version)) {
      emit(onProgress, { type: 'cache-hit', name: dep.name, version: dep.version, line: `[NxNode] ${dep.name}@${dep.version} found in store` });
    } else {
      emit(onProgress, { type: 'downloading', name: dep.name, version: dep.version, line: `[NxNode] Downloading ${dep.name}@${dep.version}...` });
      await downloadAndStore(storeName, dep.version);
    }
  }

  emit(onProgress, { type: 'linking-transitive', line: '[NxNode] Linking transitive dependencies inside store...' });
  for (const dep of allDeps) {
    linker.linkPackageDependencies(store, dep.resolvedName || dep.name, dep.version, dep.dependencies, dep.dependencyRealNames);
  }

  if (runLifecycleScripts) {
    emit(onProgress, { type: 'lifecycle-scripts-start', line: '[NxNode] Running lifecycle scripts (preinstall/install/postinstall)...' });
    for (const dep of allDeps) {
      const storeName = dep.resolvedName || dep.name;
      const meta = store.getMetadata(storeName, dep.version);
      if (!meta?.scripts || !lifecycle.hasLifecycleScripts(meta.scripts)) continue;
      const packageDir = path.join(store.getPackageDir(storeName, dep.version), 'package');
      const outcome = lifecycle.runLifecycleScripts(packageDir, dep.name, dep.version, meta.scripts, onProgress);
      if (outcome.errors?.length) {
        emit(onProgress, {
          type: 'lifecycle-scripts-warning',
          name: dep.name,
          version: dep.version,
          line: `[NxNode] Warning: ${dep.name}@${dep.version} lifecycle scripts failed — package may not work correctly.`
        });
      }
    }
  }

  emit(onProgress, { type: 'linking', line: '[NxNode] Linking packages...' });
  for (const dep of allDeps) {
    const storePackageDir = store.getPackageDir(dep.resolvedName || dep.name, dep.version);
    linker.linkPackage(root, dep.name, dep.version, storePackageDir);
  }

  const newLockData = lockfile.generateLockData(tree.resolved);
  const existingLock = lockfile.readLockFile(root);
  const mergedLock = {
    lockfileVersion: 1,
    packages: {
      ...(existingLock?.packages || {}),
      ...newLockData.packages
    }
  };
  lockfile.writeLockFile(root, mergedLock);
  registry.registerProject(root);

  emit(onProgress, {
    type: 'done',
    packageName,
    version,
    count: allDeps.length,
    line: `\n✓ ${packageName}@${version} installed with ${allDeps.length} packages`
  });
}

async function installAll(projectDir, onProgress, opts = {}) {
  const root = projectDir || project.findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('No package.json found. Run this command in a project directory.');
  }

  const pkgJson = project.readPackageJson(root);
  const allDeps = { ...(pkgJson?.dependencies || {}), ...(pkgJson?.devDependencies || {}) };
  const entries = Object.entries(allDeps);

  for (const [name, versionSpec] of entries) {
    await install(`${name}@${versionSpec}`, root, onProgress, opts);
  }

  return { installed: entries.length };
}

module.exports = { install, installAll, downloadAndStore, parsePackageArg };
