# Store — catatan perbaikan

## Masalah

Store menyimpan package per `name/version`:

```text
<storePath>/packages/<name>/<version>/package/...
```

Bila dua project memakai versi berbeda dari package yang sama — atau dua package
berbeda yang kebetulan punya **file identik** (mis. banyak LICENSE/README/ikon yang
sama) — file itu disimpan berulang kali. Dedup hanya terjadi bila versinya persis
sama. Ini gap yang disebut Plan §3.4 dan proposal.

## Pendekatan (Fase 1: dedup via hardlink antar-package)

Bukan mengubah layout (itu CAS penuh, berisiko besar memecah linker/lockfile/metadata
yang mengasumsikan `packages/<name>/<version>`). Sebagai gantinya:

- Saat menaruh sebuah file ke package di store, hitung hash-nya.
- Simpan **indeks hash → file store yang sudah ada** (`<storePath>/indexes/hashes.json`).
- Bila file dengan hash sama sudah ada di store, **hardlink** ke file itu alih-alih
  menulis salinan baru. Hardlink berbagi isi fisik → hemat disk nyata.
- Bila hardlink tidak didukung (beda filesystem, volume lain), fallback ke menulis
  file biasa (tidak fatal).
- Layout `packages/<name>/<version>/package` **tetap sama** → semua komponen yang
  ada (linker, metadata, lockfile, dataset) tidak perlu berubah.

### Catatan penting

- Hash untuk dedup memakai **konten** (sha256 cukup cepat & memadai untuk dedup;
  integrity SHA-512 tetap dipakai untuk verifikasi tarball).
- File spesial: **symlink di dalam package tidak di-hardlink** (dibuat ulang).
- Indeks hash boleh hilang — itu hanya cache percepatan; bila hilang, dedup
  jalan ulang dari file yang ditemukan.

## Perubahan file

- `src/store/dedup.js` — dedup saat menyimpan isi package (baru).
- `src/store/store.js` — helper indeks hash (`indexes/hashes.json`).
- `src/cli/install.js` — pakai dedup setelah extract package.
- `tests/` — test dedup (hardlink + fallback).

## Status

- [x] `dedup.js` (hash-index + hardlink, fallback copy)
- [x] integrasi setelah extract di install
- [x] command `nxnode store dedup` (backfill package yang sudah ada)
- [x] test + lint

✅ SUDAH DIEKSEKUSI (Fase 1)

### Bukti end-to-end

`nxnode store dedup` pada dua package dengan file `LICENSE` identik:
`fsutil hardlink list` menunjukkan satu file fisik yang sama untuk kedua package
(`LinkType = HardLink`), jadi isinya benar-benar di-share, bukan disalin.

### Belum (Fase 2, opsional)

CAS penuh (layout `store/content/<hash>` + index pemetaan) — dedup lebih agresif
tetapi mengubah struktur store secara besar dan berisiko. Tidak dilakukan.
