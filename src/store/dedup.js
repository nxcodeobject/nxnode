const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// hash index lives under the store's indexes/ folder: content-hash -> first
// file path seen with that content. It is only a cache to speed up dedup; if it
// is missing or stale, dedup still works by falling back to a plain write.
function getIndexPath(storePath) {
  return path.join(storePath, 'indexes', 'hashes.json');
}

function readIndex(storePath) {
  const indexPath = getIndexPath(storePath);
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeIndex(storePath, index) {
  const indexPath = getIndexPath(storePath);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * Dedup the contents of a freshly extracted package directory against the
 * store's hash index: files whose content already exists elsewhere in the store
 * are hardlinked instead of kept as separate copies.
 *
 * Returns { linked, written, skipped } counts. Never throws for a single file —
 * a failed hardlink just means that file keeps its own copy.
 */
function dedupDirectory(packageDir, storePath, options = {}) {
  const index = options.index || readIndex(storePath);
  const stats = { linked: 0, written: 0, skipped: 0 };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        stats.skipped++;
        continue;
      }

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.isFile()) {
        stats.skipped++;
        continue;
      }

      let digest;
      try {
        digest = hashFile(full);
      } catch {
        stats.skipped++;
        continue;
      }

      const existing = index[digest];
      if (existing && existing !== full && fs.existsSync(existing)) {
        try {
          const tmp = `${full}.nxdedup`;
          fs.renameSync(full, tmp);
          fs.linkSync(existing, full);
          fs.unlinkSync(tmp);
          stats.linked++;
          continue;
        } catch {
          // fall through: keep original file
        }
      }

      index[digest] = full;
      stats.written++;
    }
  };

  walk(packageDir);

  if (!options.index) {
    writeIndex(storePath, index);
  }

  return Object.assign(stats, { index });
}

module.exports = {
  dedupDirectory,
  hashFile,
  readIndex,
  writeIndex,
  getIndexPath
};
