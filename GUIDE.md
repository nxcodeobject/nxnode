# NxNode User Guide

Panduan lengkap menggunakan NxNode Package Manager.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Commands](#commands)
4. [Configuration](#configuration)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Install from npm

Published as **`@iandantrik/nxnode`** — the installed command is still `nxnode`:

```bash
npm install -g @iandantrik/nxnode
```

### Run from source (development)

```bash
cd D:\Framework\CLI\nxnode
npm install
node bin/nxnode.js <command>
```
Or link it locally so `nxnode` works as a global command:
```bash
cd D:\Framework\CLI\nxnode
npm link
```

### Verify Installation

```bash
nxnode --version
nxnode doctor
```

---

## Quick Start

### 1. Create New Project

```bash
mkdir my-project
cd my-project
nxnode project create my-project
```

### 2. Add Dependencies

Edit `package.json`:

```json
{
  "name": "my-project",
  "dependencies": {
    "express": "^5.1.0",
    "lodash": "^4.17.21"
  }
}
```

### 3. Install Packages

```bash
nxnode install express
nxnode install lodash
```

Or install all at once:

```bash
nxnode install express && nxnode install lodash
```

### 4. Verify Installation

```bash
nxnode list
```

Output:
```
[NxNode] Local dependencies:
  express@^5.1.0  [linked (junction) -> D:\Framework\CLI\nxnode\.store\packages\express\5.1.0\package]
  lodash@^4.17.21  [not linked yet]
```

---

## Commands

### Package Management

| Command | Description |
|---------|-------------|
| `nxnode install <package>` | Install package with dependencies (auto-adds to `package.json` if missing) |
| `nxnode install <package>@<version>` | Install a specific version, overriding whatever is in `package.json` |
| `nxnode remove <package>` | Remove package from project |
| `nxnode update <package>` | Update package to the latest version matching its declared range in `package.json` |

> **PowerShell note:** `^` is an escape character in PowerShell. Always write the version inline with no space (`nxnode install pkg@^1.2.3`), or quote the whole argument (`nxnode install "pkg@^1.2.3"`). A form like `nxnode install pkg ^1.2.3` (space-separated) will not work as expected.

### Project Management

| Command | Description |
|---------|-------------|
| `nxnode project create <name>` | Create new project |
| `nxnode link` | Link all dependencies from store |
| `nxnode unlink` | Unlink all dependencies |

### Store Management

| Command | Description |
|---------|-------------|
| `nxnode store` | Show store info |
| `nxnode store path` | Show store path |
| `nxnode store clean` | Remove unused packages (based on registered projects) |
| `nxnode store projects` | List projects registered as using this store |

### List

| Command | Description |
|---------|-------------|
| `nxnode list` | List local dependencies |
| `nxnode list --global` | List global store packages |

### Configuration

| Command | Description |
|---------|-------------|
| `nxnode config` | Show current config |
| `nxnode config <key> <value>` | Set a config value (`storePath` or `linkMode`) |
| `nxnode doctor` | Check system status |

Example:
```bash
nxnode config storePath E:\MyPackages
nxnode config linkMode symlink
```

---

## Configuration

### Config File Location

```
%USERPROFILE%\.nxnode\config.json
```

### Default Config

Default `storePath` is a `.store` folder inside the NxNode installation itself (not a fixed drive-root path), for example:

```json
{
  "storePath": "D:\\Framework\\CLI\\nxnode\\.store",
  "linkMode": "junction"
}
```

This keeps all NxNode data (source code + store) together in one place instead of scattering it elsewhere on disk. Change it any time with `nxnode config storePath <path>`.

### Config Options

| Key | Values | Description |
|-----|--------|-------------|
| `storePath` | Path string | Global store location |
| `linkMode` | `junction`, `symlink`, `hardlink`, `copy` | How packages are linked |

### Change Store Location

```bash
nxnode config storePath E:\MyPackages
```

### Change Link Mode

```bash
nxnode config linkMode symlink
```

---

## Examples

### Example 1: Two Projects, Same Package

**Project A:**
```bash
cd D:\Projects\project-a
nxnode project create project-a
```

Edit `package.json`:
```json
{
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

```bash
nxnode install express
```

**Project B:**
```bash
cd E:\Work\project-b
nxnode project create project-b
```

Edit `package.json`:
```json
{
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

```bash
nxnode install express
```

**Result:** Both projects share the same `express@5.1.0` from global store.

```
<storePath>\packages\express\5.1.0\package     ← 1 copy
    ↑                                           ↑
D:\Projects\project-a\node_modules\express     E:\Work\project-b\node_modules\express
```

### Example 2: Different Versions

**Project A needs Express 5:**
```json
{
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

**Project B needs Express 4:**
```json
{
  "dependencies": {
    "express": "^4.21.0"
  }
}
```

```bash
# In Project A
nxnode install express

# In Project B
nxnode install express
```

**Result:** Both versions stored separately:

```
<storePath>\packages\express\
├── 4.21.2\package  ← Project B
└── 5.1.0\package   ← Project A
```

### Example 3: Update Package

`nxnode update` re-resolves the version range already declared in `package.json` (e.g. `^5.1.0`) against the npm registry, so it picks up newer compatible releases within that range — it does not jump to a new major version on its own.

```bash
cd D:\Projects\my-app
nxnode update express
```

Output (when a newer compatible version exists):
```
[NxNode] Updating express...
[NxNode] Downloading express@5.1.1...
✓ express updated to 5.1.1
```

Output (when already on the latest compatible version):
```
[NxNode] Updating express...
[NxNode] express@5.1.0 is already up to date
```

### Example 4: Clean Unused Packages

`nxnode store clean` only considers packages used by projects that are registered with this store (any project where `nxnode install` or `nxnode project create` has run before). It never scans arbitrary folders on disk.

```bash
nxnode store clean
```

Output:
```
[NxNode] Checking 5 known project(s)...
  - D:\Projects\project-a
  - E:\Work\project-b
  - ...

[NxNode] Removing unused: sharp@0.34.3
[NxNode] Removing unused: ws@8.18.3

✓ Cleanup complete:
  Removed: 2 packages
  Kept: 8 packages
```

If no projects are registered yet, cleanup is skipped entirely to avoid accidentally deleting packages that are still in use:
```
[NxNode] Warning: No known projects registered. Run "nxnode install" in a project first.
[NxNode] Skipping cleanup to avoid removing packages that may still be in use.
```

Use `nxnode store projects` to see which projects are currently registered.

### Example 5: Change Store Location

```bash
# View current store
nxnode store path
# Output: D:\Framework\CLI\nxnode\.store  (default)

# Change to new location
nxnode config storePath E:\NewStore

# Verify
nxnode store path
# Output: E:\NewStore
```

Note: changing `storePath` does not move already-installed packages. Existing project links will point to the old location until you reinstall or run `nxnode link` after manually migrating the store contents.

---

## Link Modes

### Junction (Default on Windows)

```bash
nxnode config linkMode junction
```

- Creates directory junction
- Works across drives
- No admin privileges needed
- Recommended for Windows

### Symlink

```bash
nxnode config linkMode symlink
```

- Creates symbolic link
- Works across drives
- May need admin privileges on Windows

### Hardlink

```bash
nxnode config linkMode hardlink
```

- Creates hard links for files
- Best performance
- Must be same drive
- Fallback to copy for directories

### Copy

```bash
nxnode config linkMode copy
```

- Copies files physically
- No special privileges needed
- Uses more disk space
- Fallback when other modes fail

---

## Troubleshooting

### Problem: "No package.json found"

**Solution:** Run command in a project directory with `package.json`.

### Problem: `nxnode install pkg@^1.2.3` fails with "HTTP 404"

This usually means the version was written as a separate argument (`nxnode install pkg ^1.2.3`) instead of inline (`nxnode install pkg@^1.2.3`). In PowerShell specifically, `^` is a line-continuation escape character, so a space-separated version argument can get mangled or silently dropped, and the second argument then gets misread as a project directory path (causing a *different* "No package.json found" error).

**Solution:** Always keep the version attached to the package name with no space, and quote it if in doubt:

```powershell
nxnode install adm-zip@^0.5.17
# or, if PowerShell still misbehaves:
nxnode install "adm-zip@^0.5.17"
```

```bash
cd D:\Projects\my-project
nxnode install express
```

### Problem: "Integrity check failed"

NxNode verifies every downloaded tarball's SHA-512 hash against the npm registry metadata before storing it. If it doesn't match, the install is aborted (the package is never stored) — this usually means a corrupted download or a network issue.

**Solution:** Try again; if it persists, check your network/proxy configuration:

```bash
nxnode install express
```

### Problem: Linking fails

**Solution:** Change link mode:

```bash
nxnode config linkMode copy
nxnode install express
```

### Problem: Store not found

**Solution:** Check store path:

```bash
nxnode config
nxnode store path
```

### Problem: Package not in store

**Solution:** Package needs to be downloaded first:

```bash
nxnode install <package>
```

### Problem: "Cannot find module '<some-transitive-dependency>'" when requiring an installed package

This means a package's own dependencies weren't linked correctly inside the store. NxNode creates a nested `node_modules` inside each store package folder for exactly this reason (see README §6.1) — this is created automatically during `nxnode install`. If you still hit this:

**Solution:** Reinstall the package so NxNode rebuilds the nested links:

```bash
nxnode remove <package>
nxnode install <package>
```

### Problem: Junction/symlink is broken after manually moving the store folder

Windows junctions store an absolute path to their target. If you move or copy the store folder manually (e.g. with `cp`/`xcopy`/File Explorer), junctions inside it will point to the old location or become invalid — copying a junction does not "follow" it the way copying a real folder would.

**Solution:** Don't move the store manually. Instead, change `storePath` in config and reinstall affected projects so packages are re-downloaded (or re-linked from cache) at the new location:

```bash
nxnode config storePath <new-path>
cd <project>
nxnode install <package>   # re-links against the new store location
```

### Problem: "Permission denied" on Windows

This typically happens with `linkMode: symlink`, which requires Administrator privileges or Windows Developer Mode enabled. `junction` (the default) does not have this requirement.

**Solution:** Switch to `junction` (default) or `copy`:

```bash
nxnode config linkMode junction
```

---

## Tips

1. **Use same store for all projects** - Configure once, use everywhere.

2. **Check store before install** - `nxnode list --global` shows what's cached.

3. **Clean regularly** - `nxnode store clean` frees disk space.

4. **Use lock file** - `nxnode.lock` ensures reproducible installs.

5. **Link mode matters** - `junction` (the default) automatically behaves like a directory symlink on Linux/Mac, so you usually don't need to change it manually. Prefer `symlink` only if you specifically need real symlink semantics and have the required privileges (Administrator or Developer Mode on Windows).

6. **Never move the store folder manually** - See [Junction/symlink is broken after manually moving the store folder](#troubleshooting). Change `storePath` via `nxnode config storePath <new-path>` and reinstall instead.

7. **See who's using the store** - `nxnode store projects` lists every project registered against the current store, which is what `nxnode store clean` uses to decide what's safe to remove.

---

## Support

Published on npm as **`@iandantrik/nxnode`** (the installed command is still `nxnode`). Source: https://github.com/nxcodeobject/nxnode.

For issues, use the GitHub repository's issue tracker or your own project notes.

---

## Releasing a new version

Publishing to npm is driven by a **GitHub Release**, not by running `npm publish`
by hand. This keeps the published version tied to an auditable tag.

### One-time setup (Trusted Publishing)

Link the npm package to this repository so the workflow can publish without a
stored token:

1. Open https://www.npmjs.com/package/@iandantrik/nxnode/access
2. Under **Trusted Publisher**, add a **GitHub Actions** publisher:
   - Organization or user: `nxcodeobject`
   - Repository: `nxnode`
   - Workflow filename: `publish.yml`
   - Environment: (leave empty)
3. Save.

### Steps for each release

1. Bump `version` in `package.json` (e.g. `0.3.0`).
2. Commit and push to `main`.
3. Create and push the matching tag:
   ```bash
   git tag -a v0.3.0 -m "v0.3.0"
   git push origin v0.3.0
   ```
4. On GitHub, go to **Releases → Draft a new release**, choose tag `v0.3.0`, and
   **Publish release**.
5. The `publish` workflow runs automatically: it lints, tests, verifies the tag
   matches `package.json`, then runs `npm publish --access public`.

If the tag and `package.json` version disagree, the workflow fails on purpose — so
a mistyped tag can never publish the wrong version.
