# Registry — catatan perbaikan

## Masalah

`npm.js` melakukan HTTP fetch tanpa ketahanan apa pun:

- **Tidak ada retry** — satu kali gagal (network blip, 5xx, 429) langsung gagal.
- **Tidak ada timeout** — request bisa menggantung tanpa batas.
- **Tidak ada handling rate-limit** — HTTP 429 dari npm tidak dihormati
  (`Retry-After` diabaikan).
- **Redirect bisa loop** — redirect 301/302 ditangani rekursif tanpa batas
  kedalaman, dan `res.headers.location` bisa `undefined` (maka `fetchJson(undefined)`
  error membingungkan).

Proposal NLnet justru menyebut "Registry API rate limits and robust, resumable
fetching" sebagai technical challenge — jadi ini gap yang perlu ditutup.

## Perbaikan yang direncanakan

1. Helper `request` tunggal dengan:
   - timeout per-request (default 30s, tarball lebih lama);
   - redirect manual dengan batas kedalaman (mis. 5) dan validasi `location`;
   - retry dengan exponential backoff untuk error jaringan dan status
     429/500/502/503/504;
   - hormati header `Retry-After` bila ada.
2. `fetchJson` dan `fetchTarball` memakai helper yang sama.
3. Opsi `retries`/`timeout` bisa di-override (untuk test tanpa network).

## Perubahan file

- `src/registry/npm.js` — ganti `fetchJson`/`fetchTarball` memakai helper `request`.
- `tests/unit.test.js` — test helper retry/redirect (tanpa network nyata).

## Status

- [x] helper `request` dengan timeout + retry + backoff + Retry-After
- [x] redirect berbatas kedalaman
- [x] `fetchJson`/`fetchTarball` memakainya
- [x] test + lint (5 test baru; uji server HTTP lokal, tanpa internet)

✅ SUDAH DIEKSEKUSI
