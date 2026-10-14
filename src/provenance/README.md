# Provenance — catatan rencana

## Masalah

Proposal NLnet (CodeSupply) menjanjikan metadata provenance: origin (registry,
tarball, integrity hash) dan license (declared + detected) sebagai open data yang
terikat ke store + `nxnode.lock`. Saat ini:

- `install.js` menyimpan `integrity` dan `dependencies` ke metadata store, tetapi
  **tidak** menyimpan `dist.tarball` (origin tarball URL) — jadi provenance belum lengkap.
- Tidak ada deteksi license sama sekali.

## Keputusan desain

1. **Origin**: simpan `dist.tarball` (dan `dist.integrity`) dari metadata npm ke
   metadata package di store saat install.
2. **License detection**: heuristik ringan, **tanpa dependency baru** (sesuai AGENTS.md):
   - baca field `license` dan `licenses` dari `package.json` package di store;
   - baca file `LICENSE`/`LICENSE.md`/`LICENSE.txt` bila ada;
   - normalisasi nama umum/alias ke identifier SPDX (mis. `MIT`, `Apache-2.0`,
     `ISC`, `BSD-3-Clause`, `GPL-3.0-only`);
   - tandai `declared` (dari metadata) dan `detected` (dari file) secara terpisah;
   - bila tidak yakin, kembalikan `UNKNOWN` (jangan menebak).
3. **Surfacing**: command `nxnode provenance [<package>]` menampilkan provenance +
   license per package (dari store metadata).
4. Tidak ada panggilan API eksternal pada iterasi ini (OSV/vuln menyusul).

## Perubahan file

- `src/registry/npm.js` — sertakan `dist` lengkap (tarball) di `getPackageMetadata`.
- `src/cli/install.js` — simpan `tarball` + `license` (declared) ke metadata.
- `src/provenance/license.js` — modul deteksi license (baru).
- `src/provenance/index.js` — modul baca provenance dari store (baru).
- `src/cli/provenance.js` — command `nxnode provenance` (baru).
- `src/cli/index.js` — daftarkan command.
- `tests/` — test untuk license detection + provenance.

## Status

- [x] `npm.js`/`install.js` simpan tarball + license
- [x] modul license detection
- [x] modul provenance
- [x] command `nxnode provenance`
- [x] test + lint

✅ SUDAH DIEKSEKUSI (iterasi 1: fondasi + license)

Belum dikerjakan (menyusul, sesuai proposal):
- integrasi vulnerability (OSV)
- export dataset (SPDX/CycloneDX) sebagai open data
- quality signals

## Iterasi 2 — vulnerability (OSV) + export dataset

### Keputusan desain

1. **OSV**: pakai `POST https://api.osv.dev/v1/querybatch` (ecosystem `npm`), satu
   request batch untuk semua package. Hanya ambil id + modified (sesuai API). Tanpa
   dependency baru — pakai `https` bawaan Node (mengikuti pola `src/registry/npm.js`).
   Hasil **tidak** disimpan otomatis; hanya diambil saat diminta (operasi network,
   harus eksplisit dan mudah gagal-aman bila offline).
2. **Export**: `nxnode provenance --export spdx|cyclonedx` menghasilkan dokumen
   JSON standar (SPDX 2.3 / CycloneDX 1.5) dari isi store + metadata, ke stdout
   atau file (`--out <path>`). Field yang tersedia: name, version, origin
   (tarball/integrity), license (SPDX id), vulnerabilities (bila `--osv`).

### Perubahan file

- `src/provenance/osv.js` — klien OSV querybatch (baru).
- `src/provenance/export.js` — builder SPDX 2.3 & CycloneDX 1.5 (baru).
- `src/cli/provenance.js` — tambah flag `--osv`, `--export <format>`, `--out <path>`.
- `tests/` — test untuk export builder (tanpa network).

### Status

- [x] `osv.js` klien querybatch
- [x] `export.js` SPDX + CycloneDX
- [x] flag CLI `--osv`, `--export`, `--out`
- [x] test + lint

✅ SUDAH DIEKSEKUSI (iterasi 2)

Belum: quality signals (menyusul).

## Iterasi 3 — quality signals

### Keputusan desain

Quality signals harus **berbasis data yang sudah ada** (isi package di store +
metadata), tanpa API eksternal baru dan tanpa menebak. Sinyal yang dihitung:

- `hasReadme` — ada README di package.
- `hasLicenseFile` — ada file LICENSE.
- `hasRepository` — ada `repository` di package.json.
- `hasDescription` / `hasKeywords` — metadata deskriptif dasar.
- `dependencyCount` — jumlah dependency langsung.
- `scriptCount` — jumlah script npm.
- `deprecated` — flag `deprecated` bila ada di package.json.
- `integrityVerified` — apakah metadata punya integrity.
- `npmScripts` — daftar lifecycle script (preinstall/install/postinstall) yang
  ada — **sinyal keamanan** (kode yang dijalankan saat install).

Semua bersifat informatif; skor tidak "menghakimi" kualitas sebenarnya, hanya
fakta yang bisa diverifikasi. Muncul di `nxnode provenance` dan opsional di export.

### Perubahan file

- `src/provenance/quality.js` — hitung sinyal (baru).
- `src/provenance/index.js` — lampirkan quality ke hasil provenance.
- `src/cli/provenance.js` — tampilkan + flag `--quality`.
- `tests/` — test quality signals.

### Status

- [x] `quality.js`
- [x] integrasi ke provenance
- [x] tampilan CLI + flag `--quality`
- [x] test + lint

✅ SUDAH DIEKSEKUSI (iterasi 3)
