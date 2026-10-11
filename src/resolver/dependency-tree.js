const npm = require('../registry/npm');
const semver = require('./semver');
const { isPlatformCompatible } = require('./platform');

function isLocalOrGitSpec(versionSpec) {
  if (!versionSpec) return false;
  return /^(file:|link:|git\+|git:|github:|https?:\/\/)/.test(versionSpec);
}

/**
 * Parse npm alias spec: "npm:realname@versionspec" (contoh: "npm:wrap-ansi@^7.0.0").
 * Dipakai untuk mendaftarkan sebuah package di bawah nama berbeda dari nama
 * asli di registry, misal "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0".
 */
function parseNpmAlias(versionSpec) {
  if (!versionSpec || !versionSpec.startsWith('npm:')) return null;
  const rest = versionSpec.slice(4);
  const atIndex = rest.lastIndexOf('@');
  if (atIndex <= 0) return null;
  return {
    realName: rest.slice(0, atIndex),
    realVersionSpec: rest.slice(atIndex + 1)
  };
}

class DependencyTree {
  constructor() {
    this.resolved = new Map();
    this.conflicts = [];
    this.versionsByPackage = new Map();
  }

  recordVersion(name, version) {
    if (!this.versionsByPackage.has(name)) {
      this.versionsByPackage.set(name, new Set());
    }
    const versions = this.versionsByPackage.get(name);
    if (versions.size > 0 && !versions.has(version)) {
      this.conflicts.push({
        package: name,
        versions: [...versions, version]
      });
    }
    versions.add(version);
  }

  async build(name, versionSpec, depth = 0, seen = new Map()) {
    if (depth > 10) {
      console.log(`[NxNode] Warning: Max dependency depth (10) reached at ${name}@${versionSpec}, skipping deeper resolution`);
      return this.resolved;
    }

    if (isLocalOrGitSpec(versionSpec)) {
      console.log(`[NxNode] Skipping ${name} (${versionSpec}): local/git dependencies are not managed by nxnode.`);
      return this.resolved;
    }

    const alias = parseNpmAlias(versionSpec);
    const resolveName = alias ? alias.realName : name;
    const resolveSpec = alias ? alias.realVersionSpec : versionSpec;

    const version = await this.resolveVersion(resolveName, resolveSpec);
    const key = `${name}@${version}`;

    let meta;
    try {
      meta = await npm.getPackageMetadata(resolveName, version);
    } catch (err) {
      console.log(`[NxNode] Warning: Could not fetch metadata for ${key}: ${err.message}`);
      return this.resolved;
    }

    if (!isPlatformCompatible(meta)) {
      console.log(`[NxNode] Skipping ${name}@${version}: not compatible with ${process.platform}/${process.arch} (os=${JSON.stringify(meta.os)}, cpu=${JSON.stringify(meta.cpu)}).`);
      return this.resolved;
    }

    this.recordVersion(name, version);

    if (seen.has(key)) {
      return this.resolved;
    }

    seen.set(key, depth);
    this.resolved.set(key, {
      name,
      version,
      resolvedName: alias ? resolveName : undefined,
      dependencies: {},
      dependencyRealNames: {}
    });

    try {
      const deps = meta.dependencies || {};

      for (const [depName, depVersionSpec] of Object.entries(deps)) {
        if (isLocalOrGitSpec(depVersionSpec)) {
          console.log(`[NxNode] Skipping ${depName} (${depVersionSpec}): local/git dependencies are not managed by nxnode.`);
          continue;
        }

        const depAlias = parseNpmAlias(depVersionSpec);
        const depResolveName = depAlias ? depAlias.realName : depName;
        const depResolveSpec = depAlias ? depAlias.realVersionSpec : depVersionSpec;

        const resolvedDepVersion = await this.resolveVersion(depResolveName, depResolveSpec);
        const depKey = `${depName}@${resolvedDepVersion}`;

        this.resolved.get(key).dependencies[depName] = resolvedDepVersion;
        if (depAlias) {
          this.resolved.get(key).dependencyRealNames[depName] = depResolveName;
        }

        if (seen.has(depKey)) {
          continue;
        }

        await this.build(depName, depVersionSpec, depth + 1, seen);
      }
    } catch (err) {
      console.log(`[NxNode] Warning: Could not resolve dependencies for ${key}: ${err.message}`);
    }

    return this.resolved;
  }

  async resolveVersion(name, versionSpec) {
    if (!versionSpec || versionSpec === 'latest' || versionSpec === '*') {
      return npm.getLatestVersion(name);
    }

    try {
      const versions = await npm.getVersions(name);

      const cleaned = semver.clean(versionSpec);
      if (cleaned && versions.includes(cleaned)) return cleaned;

      const range = semver.parseRange(versionSpec);
      if (range) {
        const compatible = versions.filter(v => semver.satisfies(v, range));
        if (compatible.length > 0) {
          return compatible[compatible.length - 1];
        }
      }
    } catch {
      // Fall through to default
    }

    return versionSpec.replace(/^[~^>=<]*/, '');
  }

  getAll() {
    return Array.from(this.resolved.values());
  }

  getConflicts() {
    return this.conflicts;
  }

  hasConflicts() {
    return this.conflicts.length > 0;
  }
}

module.exports = { DependencyTree };
