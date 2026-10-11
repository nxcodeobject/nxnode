# Changelog

Catatan perubahan NxNode Package Manager.

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

## Future Plans

### [0.2.0] - Planned
- Workspace support untuk monorepo
- Parallel download
- Cache optimization
- Linux/macOS support improvements
- TypeScript rewrite

### [0.3.0] - Planned
- Private registry support
- Authentication
- Audit security
- Dependency analysis

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2026-09-12 | Initial MVP release |

---

## Links

- [README](README.md)
- [User Guide](GUIDE.md)
- [Development Plan](Plan.md)
