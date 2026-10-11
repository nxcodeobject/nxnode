const semver = require('./semver');
const npm = require('../registry/npm');

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

async function resolveVersion(name, versionSpec) {
  const alias = parseNpmAlias(versionSpec);
  if (alias) {
    return resolveVersion(alias.realName, alias.realVersionSpec);
  }

  if (!versionSpec || versionSpec === 'latest' || versionSpec === '*') {
    const latest = await npm.getLatestVersion(name);
    return latest;
  }

  const versions = await npm.getVersions(name);
  const cleaned = semver.clean(versionSpec);
  if (cleaned) {
    const match = versions.find(v => v === cleaned);
    if (match) return match;
  }

  const range = semver.parseRange(versionSpec);
  if (range) {
    const compatible = versions.filter(v => semver.satisfies(v, range));
    if (compatible.length > 0) {
      return compatible[compatible.length - 1];
    }
  }

  return versionSpec.replace(/^[~^>=<]*/, '');
}

module.exports = { resolveVersion };
