# Linker — catatan perbaikan

## Masalah

`fs.existsSync` tidak dapat dipercaya untuk memeriksa path yang berupa link
(symlink/junction) di sebagian environment Windows.

### Bukti

- `fs.symlinkSync(dir, target, 'junction')` **sukses** — junction benar-benar dibuat
  (`readdirSync` menampilkan entry, `readlinkSync` mengembalikan target yang benar).
- `fs.existsSync(target)` mengembalikan `false` meski link valid, karena di baliknya
  memanggil `statSync` yang gagal dengan `UNKNOWN: unknown error, stat`.
- `fs.lstatSync(target)` (tidak mengikuti link) berhasil dan mengembalikan
  `isSymbolicLink() === true`.
- Terjadi di `%TEMP%`, `D:\CLI\nxnode`, dan `C:\Users\...\Temp`.

### Penyebab

Filter filesystem (kemungkinan Windows Defender / Controlled Folder Access / driver
antivirus) menolak `stat` yang men-traverse reparse point (junction). Karena
`fs.existsSync` = `try { statSync; true } catch { false }`, hasilnya keliru.

### Dampak

`fs.existsSync` dipakai untuk memeriksa link di `linker.js:44,97,148` dan
`store.js:38` (`packageExists`). Akibatnya operasi relink/unlink/GC bisa salah, dan
2 integration test (`tests/integration.test.js:69,85`) gagal.

## Perbaikan yang direncanakan

1. Tambah helper `pathExists` di `linker.js` yang memakai `lstatSync` (tidak mengikuti
   link), dengan fallback ke `statSync` bila `lstat` tidak tersedia.
2. Ganti pemakaian `existsSync` pada path yang bisa berupa link
   (`linker.js:44,97,148`, `store.js:38`).
3. Jalankan `npm test` (target 22/22 hijau) dan `npm run lint`.

## Status

- [x] Helper `pathExists` ditambah di `linker.js`
- [x] Ganti `existsSync` pada path link di `linker.js`
- [x] Ganti `existsSync` di `store.js` (`packageExists`)
- [x] Test memakai `lstat`-based check (`tests/integration.test.js`)
- [x] `npm test` hijau (22/22)
- [x] `npm run lint` bersih

✅ SUDAH DIEKSEKUSI

## Perbaikan lanjutan (Fase A #2)

`nxnode link` sebelumnya menghitung versi dengan strip operator (`^[~^>=<]*`),
sehingga bisa mencari versi yang salah di store (mis. `^1.0.0` → `1.0.0`, padahal
yang ter-install `1.2.3`). Sekarang `link.js` mengambil versi konkret dari
`nxnode.lock` lebih dulu, baru fallback ke `resolver.resolveVersion`.

- [x] `link.js` resolve versi lewat lockfile + resolver (bukan regex)
- [x] `link` jadi async; `cli/index.js` di-`await`
- [x] Uji end-to-end: `nxnode link` memilih `1.2.3` dari lockfile (bukan `1.0.0`)

✅ SUDAH DIEKSEKUSI

