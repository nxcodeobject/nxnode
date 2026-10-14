# Rencana Eksekusi NxNode Package Manager

## Tahap 1: Setup Proyek (Minggu 1)

### 1.1 Inisialisasi Proyek
- [x] Buat `package.json` dengan metadata dasar
- [~] Setup TypeScript (`tsconfig.json`) — diputuskan tidak diperlukan, tetap JavaScript
- [x] Setup ESLint dan Prettier
- [x] Setup struktur folder sesuai dokumentasi

### 1.2 Struktur Folder
```
nxnode/
├── src/
│   ├── cli/
│   ├── resolver/
│   ├── registry/
│   ├── store/
│   ├── linker/
│   ├── project/
│   └── config/
├── bin/
├── tests/
└── package.json
```

---

## Tahap 2: CLI Foundation (Minggu 2)

### 2.1 Entry Point
- [x] Buat `bin/nxnode.js` sebagai executable
- [~] Setup commander/yargs untuk CLI parsing — belum diprioritaskan, tetap custom switch/case

### 2.2 Commands Basic
- [x] Implement `nxnode --version`
- [x] Implement `nxnode config`
- [x] Implement `nxnode doctor`

---

## Tahap 3: Global Store (Minggu 3-4)

### 3.1 Store Manager
- [x] Implement `Store` class untuk mengelola lokasi store
- [x] Setup default path: folder `.store` di dalam instalasi NxNode (bukan path absolut lepas di drive root — lihat README §14, §31)
- [x] Implement `config.json` di `%USERPROFILE%\.nxnode\`

### 3.2 Store Structure
- [x] Buat folder `packages/` di store
- [x] Implement struktur: `packages/{name}/{version}/`
- [x] Implement `metadata/` folder
- [x] Implement `indexes/` folder

### 3.3 Store Operations
- [x] `store.js` - Core store operations
- [x] `metadata.js` - Package metadata management
- [x] `integrity.js` - SHA512 integrity verification

### 3.4 Smart Store (belum dikerjakan)
- [ ] Content-addressable storage (dedup berbasis hash, README §17) — store saat ini masih per `name/version`, bukan per-hash
- [ ] Store statistics

---

## Tahap 4: npm Registry (Minggu 5)

### 4.1 Registry Client
- [x] Implement `npm.js` untuk fetch dari npm registry
- [x] Handle HTTP requests ke `registry.npmjs.org`
- [x] Parse package metadata dari npm

### 4.2 Download Manager
- [x] Download package tarball
- [x] Extract package
- [x] Verify integrity sebelum store

---

## Tahap 5: Package Install (Minggu 6-7)

### 5.1 Install Command
- [x] Implement `nxnode install <package>`
- [x] Baca `package.json` project
- [x] Resolve versi package
- [x] Tulis kembali ke `package.json` jika package belum tercatat sebagai dependency — bug sebelumnya: package ter-install & ter-link tapi tidak pernah masuk `package.json`, menyebabkan `nxnode update` gagal dengan "is not a dependency". Lihat README §7.1
- [x] Dukung sintaks `nxnode install <package>@<version>` (parsing aman untuk scoped package `@scope/name@version`) — bug sebelumnya: seluruh string `pkg@version` dikirim sebagai nama package tunggal ke npm registry, menghasilkan HTTP 404. Lihat README §7.2

### 5.2 Install Flow
```text
nxnode install express
      ↓
Baca package.json
      ↓
Resolve version
      ↓
Cek Global Store
    /        \
  ADA      TIDAK ADA
   ↓          ↓
 Link      Download
               ↓
           Store
               ↓
             Link
```

### 5.3 Store to Project Link
- [x] Create symlink/junction dari store ke project node_modules
- [x] Handle fallback ke copy jika linking gagal
- [x] Catat link manifest (`node_modules/.nxnode/links.json`) agar status link per-package terlihat via `nxnode list` — lihat README §18.1

---

## Tahap 6: Dependency Resolver (Minggu 8-10)

### 6.1 Semver Handler
- [x] Parse versi semver (`^5.1.0`, `~5.1.0`)
- [x] Resolve versi kompatibel dari npm

### 6.2 Dependency Tree
- [x] Build dependency tree dari package
- [x] Handle transitive dependencies
- [x] Detect conflicts — diperbaiki: deteksi lama false-positive untuk versi sama & false-negative untuk versi benar-benar beda; sekarang melaporkan seluruh versi berbeda yang ditemukan per-package — lihat README §8.1
- [x] Nested `node_modules` di dalam package store agar transitive dependency ter-resolve saat `require()` — lihat README §6.1

### 6.3 Lock File
- [x] Generate `nxnode.lock`
- [x] Read lock file untuk reproducibility
- [x] Merge lockfile antar-install (bukan overwrite) — bug kritis: overwrite menyebabkan `store clean` salah hapus package dari install sebelumnya karena dianggap tidak dipakai, lihat README §23

### 6.4 Scoped Package Support
- [x] Encode nama scoped package (`@scope/name` → `@scope+name`) untuk penyimpanan store internal
- [x] Struktur `node_modules/@scope/name` tetap sesuai konvensi Node.js di sisi project — lihat README §4.1

---

## Tahap 7: Remove & Update (Minggu 11)

### 7.1 Remove Command
- [x] Implement `nxnode remove <package>`
- [x] Unlink dari project
- [x] Jangan hapus dari store jika masih dipakai project lain

### 7.2 Update Command
- [x] Implement `nxnode update <package>`
- [x] Resolve versi baru
- [x] Update link

---

## Tahap 8: Advanced Features (Minggu 12-14)

### 8.1 Linking Strategies
- [x] Implement symlink mode
- [x] Implement junction mode (Windows)
- [x] Implement hardlink mode
- [x] Fallback ke copy

### 8.2 Store Management
- [x] Implement `nxnode store path`
- [x] Implement `nxnode store clean` (garbage collection, berbasis project registry di `store/indexes/projects.json` — lihat §22 README)
- [x] Implement `nxnode store projects` (lihat daftar project terdaftar tanpa menjalankan GC)
- [x] Implement `nxnode list` dan `nxnode list --global`

### 8.3 Project Management
- [x] Implement `nxnode project create <name>`
- [x] Implement `nxnode link` / `nxnode unlink`

### 8.4 Provenance & License (deliverable NLnet CodeSupply — lihat `src/provenance/README.md`)
- [x] Simpan origin (tarball URL) + license declared di metadata store saat install
- [x] Modul deteksi license (SPDX): heuristik declared (package.json) + detected (file LICENSE), tanpa dependency baru
- [x] Modul provenance: gabungkan origin + integrity + license per package di store
- [x] Command `nxnode provenance [<package>]`
- [x] Integrasi vulnerability (OSV querybatch) via flag `--osv`
- [x] Export dataset SPDX 2.3 & CycloneDX 1.5 (`--export spdx|cyclonedx`, `--out <path>`)
- [x] Quality signals (readme/license/repository/description/keywords/deps/scripts/deprecated/integrity/install-scripts) via `--quality`

---

## Tahap 9: Testing (Minggu 15-16)

### 9.1 Unit Tests
- [x] Test store operations
- [x] Test resolver
- [x] Test linker

### 9.2 Integration Tests
- [x] Test install flow lengkap
- [x] Test multi-project scenario
- [x] Test garbage collection

### 9.3 Perbaikan reliability linker (2 test yang sebelumnya gagal)
- [x] `pathExists` (lstat-based) menggantikan `existsSync` untuk path link di `linker.js` & `store.js` — bug: `fs.existsSync` (stat-based) melaporkan junction valid sebagai hilang di sebagian environment Windows, membuat 2 test gagal
- [x] Test memakai pemeriksaan lstat di `tests/integration.test.js`
- [x] `nxnode link` resolve versi lewat lockfile + resolver (bukan strip regex) — lihat `src/linker/README.md`

---

## Tahap 10: Documentation & Release (Minggu 17)

### 10.1 Documentation
- [x] Update README.md
- [x] Add usage examples
- [x] Add troubleshooting guide

### 10.2 Release
- [ ] Publish ke npm
- [ ] Create GitHub release

---

## Milestone

| Fase | Target | Output | Status |
|------|--------|--------|--------|
| Phase 1 | Minggu 1-2 | CLI basic + Store setup | DONE |
| Phase 2 | Minggu 3-7 | Install single package | DONE |
| Phase 3 | Minggu 8-11 | Full dependency resolution | DONE |
| Phase 4 | Minggu 12-17 | Advanced features + Release | DONE |

---

## Tech Stack

- **Runtime:** Node.js
- **Language:** JavaScript
- **CLI Parser:** Custom (switch/case)
- **HTTP Client:** Node.js built-in http/https
- **Testing:** Node.js built-in test runner
- **Build:** N/A

---

## Key Files Created

```
src/
├── cli/index.js           # CLI entry
├── cli/install.js         # Install command
├── cli/remove.js          # Remove command
├── cli/update.js          # Update command
├── cli/list.js            # List command
├── cli/store.js           # Store command
├── cli/configCmd.js       # Config command
├── cli/projectCmd.js      # Project command
├── cli/link.js            # Link/unlink command
├── cli/clean.js           # Garbage collection
├── store/store.js         # Store operations
├── store/integrity.js     # Integrity check
├── store/lockfile.js      # Lock file management
├── store/registry.js      # Known-projects index (used by GC)
├── registry/npm.js        # npm registry client
├── resolver/resolver.js   # Version resolver
├── resolver/semver.js     # Semver parser
├── resolver/dependency-tree.js # Dependency tree builder
├── linker/linker.js       # Package linking
├── project/project.js     # Project operations
└── config/config.js       # Config management
```
