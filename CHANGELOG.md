# Changelog

Catatan perubahan NxNode Package Manager.

---

## [Unreleased]

### Added
- **Registry fetch resilience**: retry dengan exponential backoff, hormati
  `Retry-After`, timeout per-request, dan batas kedalaman redirect di
  `src/registry/npm.js` (menutup klaim proposal "robust, resumable fetching")
- **Open dataset**: `nxnode provenance --dataset <dir>` menulis satu file JSON per
  package + `index.json` berschemaVersion (`src/provenance/dataset.js`)
- **Store dedup**: file identik antar package di store di-share lewat hardlink
  (backend: `src/store/dedup.js`; command `nxnode store dedup` untuk backfill).
  Layout `packages/<name>/<version>` tetap tidak berubah
- **CONTRIBUTING.md**: panduan kontribusi (setup, lint/test, gaya kode, PR)

---

## [0.1.0] - 2026-09-12

### Added

#### Core Features
- Global Package Store untuk menyimpan package secara terpusat
- Dependency Resolver untuk resolve versi package
- Project Linker untuk link package dari store ke project
- npm Registry integration untuk download package
- Integrity verification (SHA512)
- Semver parser untuk handle versi package
- Dependency Tree builder untuk transitive dependencies
- Lock file (`nxnode.lock`) untuk reproducibility

#### CLI Commands
- `nxnode install <package>` - Install package dengan dependencies
- `nxnode remove <package>` - Hapus package dari project
- `nxnode update <package>` - Update package ke versi terbaru
- `nxnode link` - Link semua dependencies dari store
- `nxnode unlink` - Unlink semua dependencies
- `nxnode list` - List dependencies lokal
- `nxnode list --global` - List packages di global store
- `nxnode store` - Tampilkan info store
- `nxnode store path` - Tampilkan lokasi store
- `nxnode store clean` - Hapus packages yang tidak terpakai
- `nxnode config` - Tampilkan konfigurasi
- `nxnode config <key> <value>` - Ubah konfigurasi
- `nxnode project create <name>` - Buat project baru
- `nxnode doctor` - Cek status sistem

#### Link Modes
- Junction (default Windows)
- Symlink
- Hardlink
- Copy (fallback)

#### Configuration
- Config file di `%USERPROFILE%\.nxnode\config.json`
- Default store: `D:\NxNodeStore`
- Configurable link mode

#### Testing
- Unit tests untuk Config, Semver, Integrity, Store
- Integration tests untuk Install Flow, Linker, Lockfile

#### Documentation
- README.md dengan konsep dan arsitektur
- GUIDE.md dengan panduan penggunaan lengkap
- Plan.md dengan rencana pengembangan

---

## [0.2.0] - 2026-10-15

Fokus rilis ini: **provenance, license, dan supply-chain metadata** untuk shared
store (deliverable NLnet CodeSupply), plus dua perbaikan reliability pada linker.

### Added

#### Provenance & Supply-Chain Metadata
- **Origin metadata**: package di store kini menyimpan `tarball` URL dari npm di
  samping integrity hash, sehingga provenance bisa diverifikasi dari store sendiri
- **License detection** (`src/provenance/license.js`): pemetaan heuristik ke
  identifier SPDX, melaporkan `declared` (dari `package.json`) dan `detected`
  (dari file `LICENSE`) secara terpisah, plus flag `mismatch`; tanpa dependency baru
- **Vulnerability data** (`src/provenance/osv.js`): integrasi OSV querybatch
  (`api.osv.dev`), bersifat best-effort agar provenance tetap jalan saat offline
- **Quality signals** (`src/provenance/quality.js`): fakta terverifikasi
  (readme, license file, repository, description, keywords, jumlah dependency/script,
  deprecated, integrity, lifecycle script)
- **SBOM export** (`src/provenance/export.js`): output SPDX 2.3 dan CycloneDX 1.5
  dari isi store

#### CLI Commands
- `nxnode provenance [<package>]` - Tampilkan origin/integrity/license/quality
  - `--osv` - Sertakan data vulnerability dari OSV
  - `--quality` - Detail quality signals
  - `--export spdx|cyclonedx [--out <file>]` - Ekspor SBOM

#### Reliability
- `pathExists` berbasis `lstat` menggantikan `fs.existsSync` (stat-based) untuk
  path yang berupa link di `linker.js` dan `store.js` — `fs.existsSync` melaporkan
  junction yang valid sebagai hilang di sebagian environment Windows
- `nxnode link` resolve versi lewat `nxnode.lock` + resolver, bukan lagi menghapus
  operator range dengan regex (yang bisa memilih versi salah di store)

#### CI & Release
- CI GitHub Actions menjalankan lint + test pada Node 18/20/22
- Publish otomatis ke npm dari GitHub Release via trusted publishing (OIDC)
- Dipublikasikan sebagai `@iandantrik/nxnode` (nama `nxnode` ditolak npm karena
  terlalu mirip package lain)

### Fixed
- Dua integration test linker yang sebelumnya gagal kini hijau (lihat Reliability)
- `tests/integration.test.js` memakai pemeriksaan `lstat` untuk link

### Notes
- Store masih menyimpan package per `name/version`, **belum** content-addressable
  (dedup berbasis hash) — masih planned, lihat Plan.md §3.4

---

## Future Plans

### [0.3.0] - Planned
- Content-addressable store (dedup berbasis hash)
- Workspace support untuk monorepo
- Private registry support
- Parallel download & cache optimization

### [0.4.0] - Planned
- Authentication
- Linux/macOS support improvements

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.2.0 | 2026-10-15 | Provenance, license, vulnerability (OSV), SBOM export, quality signals |
| 0.1.0 | 2026-09-12 | Initial MVP release |

---

## Links

- [README](README.md)
- [User Guide](GUIDE.md)
- [Development Plan](Plan.md)
