function clean(version) {
  if (!version) return null;
  return version.replace(/^[~^>=<]*/, '').trim();
}

function parse(version) {
  const cleaned = clean(version);
  if (!cleaned) return null;
  const parts = cleaned.split('.');
  const major = parseInt(parts[0], 10);
  if (Number.isNaN(major)) return null;
  const minor = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
  const patch = parts[2] !== undefined ? parseInt(parts[2], 10) : 0;
  if (Number.isNaN(minor) || Number.isNaN(patch)) return null;
  return { major, minor, patch };
}

function parseRange(range) {
  if (!range) return null;
  const cleaned = range.trim();

  if (cleaned.startsWith('^')) {
    const ver = parse(cleaned);
    if (!ver) return null;
    return { operator: '^', version: ver };
  }
  if (cleaned.startsWith('~')) {
    const ver = parse(cleaned);
    if (!ver) return null;
    return { operator: '~', version: ver };
  }
  if (cleaned.startsWith('>=')) {
    const ver = parse(cleaned.replace('>=', ''));
    if (!ver) return null;
    return { operator: '>=', version: ver };
  }

  // Wildcard style: "1.x", "1.x.x", "1.0.x", "1.0.X", "1.0.*"
  const rawParts = cleaned.split('.');
  const wildcardIndex = rawParts.findIndex((p) => /^[xX*]$/.test(p));
  if (wildcardIndex !== -1) {
    const numericParts = rawParts.slice(0, wildcardIndex);
    if (numericParts.length === 0) return null;
    const major = parseInt(numericParts[0], 10);
    if (Number.isNaN(major)) return null;
    const minor = numericParts[1] !== undefined ? parseInt(numericParts[1], 10) : 0;
    if (Number.isNaN(minor)) return null;
    if (wildcardIndex === 1) {
      return { operator: '^', version: { major, minor: 0, patch: 0 } };
    }
    return { operator: '~', version: { major, minor, patch: 0 } };
  }

  const parts = cleaned.split('.');
  const ver = parse(cleaned);
  if (!ver) return null;
  if (parts.length < 3) {
    return { operator: '^', version: ver };
  }
  return { operator: '=', version: ver };
}

function satisfies(version, range) {
  const ver = parse(version);
  if (!ver) return false;
  if (!range) return true;

  const { operator, version: rangeVer } = range;

  switch (operator) {
    case '=':
      return ver.major === rangeVer.major && ver.minor === rangeVer.minor && ver.patch === rangeVer.patch;
    case '^':
      if (ver.major !== rangeVer.major) return false;
      if (ver.minor < rangeVer.minor) return false;
      if (ver.minor === rangeVer.minor && ver.patch < rangeVer.patch) return false;
      return true;
    case '~':
      if (ver.major !== rangeVer.major) return false;
      if (ver.minor !== rangeVer.minor) return false;
      return ver.patch >= rangeVer.patch;
    case '>=':
      if (ver.major > rangeVer.major) return true;
      if (ver.major < rangeVer.major) return false;
      if (ver.minor > rangeVer.minor) return true;
      if (ver.minor < rangeVer.minor) return false;
      return ver.patch >= rangeVer.patch;
    default:
      return false;
  }
}

function gt(v1, v2) {
  const a = parse(v1);
  const b = parse(v2);
  if (!a || !b) return false;
  if (a.major > b.major) return true;
  if (a.major < b.major) return false;
  if (a.minor > b.minor) return true;
  if (a.minor < b.minor) return false;
  return a.patch > b.patch;
}

function lt(v1, v2) {
  const a = parse(v1);
  const b = parse(v2);
  if (!a || !b) return false;
  if (a.major < b.major) return true;
  if (a.major > b.major) return false;
  if (a.minor < b.minor) return true;
  if (a.minor > b.minor) return false;
  return a.patch < b.patch;
}

module.exports = { clean, parse, parseRange, satisfies, gt, lt };
