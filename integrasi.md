# Rencana Integrasi NxNode ↔ NxDOM

## 1. Latar Belakang

User banyak membuat proyek baru menggunakan **nxdom** (`D:\Framework\CLI\nxdom\`, dipublish sebagai `nxdom-cli` di npm registry publik, versi `1.0.17` saat dokumen ini ditulis) — sebuah CLI scaffolding tool untuk membuat runtime Web (Express), Mobile (Expo/React Native), Desktop (Electron), dan Backend (PHP/Laravel-style). Setiap kali nxdom membuat runtime baru untuk sebuah project, ia menjalankan `npm install` dari nol di project tersebut.

Karena banyak project dibuat dari template yang sama (misalnya template Web selalu butuh Express + dependency umum lain, template Mobile selalu butuh Expo + React Native, dst.), setiap project menyimpan salinan fisik package yang **identik** di `node_modules` masing-masing. Ini persis masalah yang sudah diselesaikan **nxnode** (`D:\Framework\CLI\nxnode\`) — package manager custom dengan Global Store bersama yang sudah dibangun dan diperbaiki sepanjang sesi sebelumnya.

**Konteks penting — nxdom sudah publik, dengan basis pengguna nyata, dan punya dua jalur distribusi:**

- **Skala pemakaian nyata:** `nxdom-cli` tercatat **1.057 download** dalam satu minggu (17–23 Mei 2026) di npm, versi `1.0.17`, lisensi MIT. Ini bukan proyek eksperimen kecil — perubahan pada cara instalasi dependency-nya berpotensi memengaruhi banyak pengguna aktif, bukan cuma di mesin ini.
- **Via npm** (`npm install -g nxdom-cli`) — dipakai siapa pun dari registry publik, bukan cuma di mesin ini.
- **Via `nxdom.exe`** (Node.js Single Executable Application) — dibangun dengan `esbuild` (`bundle: true`) yang mem-bundle seluruh source + dependency `nxdom` jadi satu file `.cjs`, lalu di-inject ke binary Node lewat `postject` (lihat `scripts/build-exe.mjs`). Executable ini **tidak butuh Node.js terinstal** di komputer pengguna akhir, tapi tetap men-**spawn** `npm`/`npx` sebagai proses eksternal untuk instalasi dependency Web/Desktop/Mobile (dikonfirmasi di `teknis.md`: *"Aksi runtime tertentu tetap membutuhkan tool eksternal ... npm/npx untuk Web, Desktop, dan Mobile"*).

**Implikasi langsung terhadap rencana integrasi:** nxnode **tidak bisa** diintegrasikan lewat path lokal (`file:../nxnode` atau path absolut `D:\Framework\CLI\nxnode\...`) untuk rilis nyata — itu hanya berfungsi di mesin developer ini. Supaya integrasi bekerja untuk:
- pengguna `npm install -g nxdom-cli` di mesin lain, **dan**
- proses build `nxdom.exe` yang mem-bundle dependency via esbuild,

nxnode **wajib dipublish sebagai package npm** (lihat §4.3 dan §5.5 — revisi dari draf sebelumnya yang masih menyarankan `file:` dependency sebagai rekomendasi utama). Karena ada pengguna aktif nyata, perubahan pada `nxdom-cli` juga sebaiknya dirilis bertahap (lihat §6) dan tidak memaksa migrasi mendadak yang bisa memutus alur kerja siapa pun yang sudah bergantung pada perilaku `npm install` bawaan saat ini.

**Tujuan dokumen ini:** merancang cara nxdom memanfaatkan nxnode untuk instalasi dependency npm-nya, sehingga:
- Tidak lagi menjalankan `npm install` mentah per-project
- Package fisik dibagi lintas semua project yang dibuat nxdom (mengurangi duplikasi disk & waktu install)
- Tetap kompatibel dengan alur kerja nxdom yang sudah ada (progress bar, prompt konfirmasi, dll.)
- Tetap berfungsi untuk pengguna nxdom di luar mesin ini, baik lewat instalasi npm maupun `nxdom.exe`

**Scope integrasi: tiga runtime — Web, Desktop, Mobile.** Ketiganya sama-sama bergantung pada `npm install` untuk dependency-nya, sehingga sama-sama diuntungkan oleh Global Store bersama nxnode. Backend (PHP/Laravel-style) **tidak termasuk scope** — prasyaratnya Composer/PHP, bukan npm, sehingga tidak relevan untuk integrasi ini (lihat §6 Fase 4).

---

## 2. Cara Kerja NxNode (Ringkasan untuk Integrasi)

### 2.1 Modul Inti yang Sudah Diexport (dapat dipanggil programmatic)

NxNode adalah CommonJS (`package.json` nxnode tidak punya `"type": "module"`). Modul-modul di `src/` sudah mengexport fungsi async biasa lewat `module.exports`, **bukan** terkunci di dalam `main()` CLI:

| File | Export | Kegunaan untuk integrasi |
|---|---|---|
| `src/cli/install.js` | `install(packageArg, projectDir)`, `downloadAndStore`, `parsePackageArg` | Fungsi utama — install satu package + seluruh transitive dependency-nya ke sebuah project |
| `src/store/store.js` | `getStorePath`, `getPackageDir`, `ensureStore`, `packageExists`, `saveMetadata`, `getMetadata`, `listPackages`, `removePackage` | Query & manajemen Global Store langsung tanpa lewat CLI |
| `src/linker/linker.js` | `linkPackage`, `unlinkPackage`, `isLinked`, `readManifest`, `linkPackageDependencies` | Linking manual (jarang dibutuhkan langsung — biasanya cukup lewat `install()`) |
| `src/resolver/resolver.js` | `resolveVersion(name, versionSpec)` | Resolve versi semver ke versi konkret dari npm registry |
| `src/resolver/dependency-tree.js` | `DependencyTree` (class) | Bangun pohon dependency lengkap (transitive) untuk satu package |
| `src/project/project.js` | `findProjectRoot`, `readPackageJson`, `addDependency`, `removeDependency`, `getDependencies`, `createProject` | Baca/tulis `package.json` project |
| `src/store/lockfile.js` | `readLockFile`, `writeLockFile`, `generateLockData` | Baca/tulis `nxnode.lock` per project |
| `src/store/registry.js` | `registerProject`, `unregisterProject`, `listProjects` | Project registry — dipakai `store clean` (garbage collection) |
| `src/config/config.js` | `load`, `get`, `set` | Baca/ubah konfigurasi (`storePath`, `linkMode`) |

**Implikasi penting:** nxdom **tidak perlu** `spawn()` proses CLI `nxnode` terpisah. Ia bisa `require()` `install()` langsung sebagai library call dalam proses Node yang sama — lebih cepat, lebih mudah menangani error, dan progress bisa di-hook langsung tanpa parsing stdout seperti pola `runNpmInstall` yang dipakai nxdom saat ini.

### 2.2 Alur `install()` End-to-End

```
install(packageArg, projectDir)
        │
        ▼
parsePackageArg → pisahkan nama & versi (mendukung "pkg@version" dan scoped "@scope/pkg@version")
        │
        ▼
Cari project root (findProjectRoot dari cwd, atau projectDir eksplisit)
        │
        ▼
Baca package.json → tentukan versionSpec (dari package.json, atau requestedVersion dari argumen, atau "latest")
        │
        ▼
resolver.resolveVersion() → versi konkret dari npm registry
        │
        ▼
Kalau belum tercatat di package.json → project.addDependency() (auto-write)
        │
        ▼
DependencyTree.build() → resolve SELURUH transitive dependency
        │
        ▼
Untuk setiap package dalam tree:
    store.packageExists()?
        ADA  → skip download
        TIDAK → downloadAndStore() (fetch tarball npm, verify integrity SHA-512, extract ke store)
        │
        ▼
linker.linkPackageDependencies() → buat nested node_modules DI DALAM store
                                     (supaya require() transitive dependency berhasil)
        │
        ▼
linker.linkPackage() → link (junction/symlink) dari store ke <project>/node_modules
        │
        ▼
lockfile: baca nxnode.lock lama → MERGE dengan hasil baru → tulis ulang (bukan overwrite)
        │
        ▼
registry.registerProject() → catat project ini di indexes/projects.json
```

### 2.3 Konfigurasi

- Lokasi store: default `.store/` di dalam folder instalasi nxnode (`D:\Framework\CLI\nxnode\.store`), bisa diubah lewat `%USERPROFILE%\.nxnode\config.json` (`storePath`, `linkMode`).
- **Konfigurasi ini global per-user**, bukan per-invocation. Semua pemanggil (termasuk nxdom nantinya) akan memakai store yang sama secara otomatis — ini justru yang diinginkan untuk sharing lintas tool.
- `linkMode` default `junction` (aman tanpa admin privilege di Windows).

### 2.4 Keterbatasan yang Relevan untuk Integrasi

1. **Single-project-per-call** — `install()` menangani satu project (satu `package.json`) per pemanggilan. Untuk install banyak package ke satu project, nxdom perlu memanggil `install()` berkali-kali (looping), bukan sekali panggil dengan array.
2. **Tidak ada API "install semua dependency dari package.json sekaligus"** — nxnode saat ini dirancang untuk `nxnode install <package>` satu-satu (mirroring alur README). Nxdom generate `package.json` template yang sudah berisi banyak dependency sekaligus (lihat §3), jadi butuh wrapper yang membaca `package.json` dan memanggil `install()` untuk tiap entry `dependencies`.
3. **`nxnode.lock` bersifat kumulatif per-project** (baru diperbaiki sesi ini — sebelumnya overwrite, sekarang merge). Aman dipanggil berkali-kali dalam loop tanpa saling menimpa.
4. **Project registry (`indexes/projects.json`)** dipakai untuk `nxnode store clean` (garbage collection) menentukan package mana yang masih dipakai. Project yang dibuat nxdom **harus** ter-registrasi (otomatis terjadi saat `install()` dipanggil) supaya tidak salah dihapus saat GC.
5. **CommonJS vs ESM** — nxnode CommonJS, nxdom ESM (`"type": "module"`). Ini bisa diatasi karena Node ESM bisa `import` module CommonJS default export (lihat §4.2), tapi named export dari CommonJS via `import { install } from ...` punya keterbatasan — perlu dites dan didokumentasikan caranya.
6. **Tidak ada opsi "dry-run" atau "hanya resolve tanpa link"** — kalau nxdom butuh preview dependency sebelum benar-benar install (misal untuk hitung total package demi progress bar, pola yang sudah ada di `countNpmPackages()` nxdom), perlu tambahan kecil di nxnode atau nxdom baca `package.json` sendiri seperti sekarang.
7. **Error handling `install()` masih `process.exit(1)`** di beberapa jalur (misal saat `package.json` tidak ditemukan) — ini **tidak aman** dipanggil langsung dari proses nxdom, karena akan mematikan seluruh proses CLI nxdom, bukan cuma gagal satu langkah. Ini **harus diperbaiki dulu** di nxnode sebelum diintegrasikan (lihat §5.1) — ganti `process.exit()` jadi `throw Error()` di jalur yang dipanggil programmatic.

---

## 3. Cara Kerja NxDOM (Titik Integrasi)

### 3.1 Pola Instalasi Saat Ini

NxDOM punya 4 service file yang masing-masing punya fungsi `installX()` untuk satu jenis runtime, dan semuanya mengikuti pola yang **hampir identik**:

| File | Fungsi utama | Baris kunci `npm install` |
|---|---|---|
| `src/services/webInstall.js` | `installWeb(projectRoot, config, opts)` | `runNpmInstall()` baris ~494, dipanggil baris ~649 |
| `src/services/mobileInstall.js` | `installMobile(...)` (+ `installMobileRequiredModules`) | `runNpmInstall()` baris ~552, dipanggil baris ~977 & ~963 |
| `src/services/desktopInstall.js` | `installDesktop(...)` | `runNpmInstall()` baris ~889, dipanggil baris ~1065 |
| `src/services/backendInstall.js` | `installBackend(...)` | pola sama, baris ~894/~920 |

Pola yang berulang di keempat file:
```js
function runNpmInstall(cwd, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(isWin ? "npm.cmd" : "npm", ["install", "--no-fund", "--no-audit"], { cwd, ... });
    // parsing stdout untuk progress, resolve/reject di child.on("close")
  });
}
```

Alur tiap `installX()`:
1. `copyTree(srcRoot, destRoot, ...)` — salin template runtime (berisi `package.json` dengan dependency tetap) ke folder project baru.
2. `writeProjectPackageJson()` — tulis ulang `name`/`version` di `package.json` yang baru disalin.
3. `writeProjectConfigJs()`, `writeProjectAppJs()` — generate file konfigurasi lain.
4. **Kalau `!opts.skipDependencies`** → panggil `runNpmInstall(destRoot, ...)`.

### 3.2 Orkestrasi Terpusat: `runtimeActions.js`

`src/services/runtimeActions.js` meng-import semua fungsi `installX`/`uninstallX`/`reinstallX` dari keempat file di atas, dan menjadi titik masuk tunggal yang dipakai baik oleh menu interaktif CLI maupun (disebut eksplisit di komentar) oleh **tool-calling** (kemungkinan integrasi AI assistant nxdom). Ini kandidat kuat sebagai **satu titik integrasi terpusat**, bukan mengubah 4 file terpisah.

### 3.3 Flag yang Sudah Ada: `opts.skipDependencies`

Keempat fungsi install sudah mendukung `opts.skipDependencies` untuk **melewati** langkah `npm install` sepenuhnya. Ini flag yang sudah siap pakai sebagai titik masuk: nxdom bisa memanggil `installWeb(root, config, { skipDependencies: true })` lalu menjalankan instalasi dependency lewat nxnode secara terpisah setelahnya — **tanpa mengubah fungsi `installX` itu sendiri**.

---

## 4. Opsi Desain Integrasi

### Opsi A — Wrapper Terpisah, Pakai Flag `skipDependencies` yang Sudah Ada (Non-invasif)

Buat modul baru di nxdom, misal `src/services/nxnodeInstall.js`, yang:
1. Memanggil `installWeb/installMobile/installDesktop/installBackend(..., { skipDependencies: true, ... })` — proses copy template & config tetap seperti sekarang, tapi `npm install` dilewati.
2. Baca `package.json` yang baru ditulis di `destRoot`.
3. Loop tiap entry di `dependencies`/`devDependencies`, panggil `nxnodeInstall.install(`${name}@${version}`, destRoot)` untuk masing-masing.

**Kelebihan:** tidak menyentuh 4 file service nxdom sama sekali — perubahan terisolasi di 1 file baru + 1 titik panggil di `runtimeActions.js`. Risiko regresi sangat rendah.

**Kekurangan:** kehilangan progress bar granular yang sudah ada (`onLine` callback dari `runNpmInstall`) kecuali dibangun ulang di wrapper baru.

### Opsi B — Ganti Isi `runNpmInstall()` di 4 File, Pertahankan Signature

Ganti isi fungsi `runNpmInstall(cwd, onProgress)` di keempat file supaya secara internal memanggil nxnode (loop `install()` per dependency) alih-alih `spawn("npm", ["install"])`, tapi **signature dan pemanggil tidak berubah** (`runNpmInstall(destRoot, callback)` tetap dipanggil persis sama seperti sekarang).

**Kelebihan:** progress callback (`onProgress`/`onLine`) tetap bisa dipertahankan — nxnode `install()` bisa di-`console.log` dan di-intercept, atau (lebih baik) nxnode ditambah opsi callback progress (lihat §5.2).

**Kekurangan:** menyentuh 4 file berbeda — permukaan perubahan lebih besar, meski isinya template yang sama sehingga risikonya masih terkendali.

### Opsi C — Sentralisasi di `runtimeActions.js` (Direkomendasikan)

Karena `runtimeActions.js` sudah menjadi titik orkestrasi tunggal untuk semua runtime, taruh logika "install dependency lewat nxnode" di sana sebagai satu fungsi `installDependenciesViaNxnode(projectRoot)` yang dipanggil setelah tiap `installX(..., { skipDependencies: true })`. Ini menggabungkan kebersihan Opsi A (non-invasif ke 4 file service) dengan titik kontrol tunggal (tidak terduplikasi 4x seperti kalau ditaruh di wrapper terpisah tapi dipanggil manual per tempat).

**Rekomendasi: Opsi C.** Alasan: memakai flag yang sudah ada (`skipDependencies`), perubahan terpusat di satu file orkestrasi yang memang untuk itu fungsinya, dan tidak mengubah 4 file service sama sekali (mengurangi risiko regresi pada fitur yang sudah stabil).

### 4.1 Sketsa Implementasi (Opsi C)

```js
// nxdom: src/services/nxnodeBridge.js (baru)
import nxnodePkg from "nxnode"; // via npm link saat development, dependency npm biasa setelah publish (lihat §4.2, §4.3)
const { install } = nxnodePkg;
import fs from "node:fs/promises";
import path from "node:path";

export async function installDependenciesViaNxnode(projectRoot, onProgress) {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const entries = Object.entries(allDeps);

  for (const [name, version] of entries) {
    onProgress?.({ type: "line", line: `Installing ${name}@${version} via nxnode` });
    await install(`${name}@${version}`, projectRoot);
  }
  return { installed: entries.length };
}
```

```js
// nxdom: src/services/runtimeActions.js (titik panggil, disisipkan setelah installX)
import { installDependenciesViaNxnode } from "./nxnodeBridge.js";

// contoh untuk Web:
const result = await installWeb(root, config, { ...opts, skipDependencies: true });
await installDependenciesViaNxnode(result.projectRoot, opts.onProgress);
```

### 4.2 Mengatasi CommonJS ↔ ESM

Karena nxnode CommonJS dan nxdom ESM, cara amannya:

```js
import nxnodePkg from "nxnode"; // default import, aman untuk CJS
const { install } = nxnodePkg;
```

Named import (`import { install } from "nxnode"`) *kemungkinan* juga jalan berkat heuristik `cjs-module-lexer` Node, tapi tidak dijamin selalu — default import lalu destructure di atas **selalu** aman untuk package CommonJS, jadi itu yang dipakai di seluruh sketsa kode dokumen ini.

### 4.3 Cara nxdom Merujuk ke nxnode — Wajib Lewat Nama Package npm, Bukan Path Lokal

**Revisi penting dari draf awal dokumen ini:** karena nxdom sudah dipublish publik (`nxdom-cli` di npm registry, lihat §1) dan juga didistribusikan sebagai `nxdom.exe` yang di-bundle lewat esbuild (lihat `scripts/build-exe.mjs`), pendekatan `file:../nxnode` atau path absolut **tidak valid untuk rilis nyata** — itu cuma bekerja selama nxdom dan nxnode ada di mesin yang sama dengan struktur folder yang sama, yang tidak berlaku untuk:

- Pengguna yang `npm install -g nxdom-cli` di komputer lain — path `file:../nxnode` akan gagal resolve karena folder nxnode tidak ada di sana.
- Proses `npm run build:exe` — esbuild butuh menemukan `nxnode` sebagai module resolvable di `node_modules` untuk di-bundle; ini tetap bisa dipenuhi via `file:` **hanya selama build dijalankan di mesin developer yang sama**, tapi begitu package `nxdom-cli` versi baru di-publish ke npm dengan dependency `file:../nxnode`, npm **menolak** mem-publish dependency berjenis `file:` dengan benar untuk dipakai orang lain (path lokal tidak portable, dan npm publish akan menyertakan path itu apa adanya — rusak di mesin lain).

**Satu-satunya jalan yang benar untuk rilis nyata:** nxnode harus dipublish ke npm registry (publik seperti nxdom-cli, atau ke registry privat kalau belum siap publik), lalu nxdom menambahkannya sebagai dependency versi biasa:

```json
{
  "dependencies": {
    "nxnode": "^0.1.0"
  }
}
```

Ini otomatis menyelesaikan kedua kasus di atas — `npm install -g nxdom-cli` menarik nxnode dari registry seperti dependency lain, dan `esbuild` saat build exe akan menemukannya di `node_modules` seperti biasa untuk di-bundle.

**Untuk development/testing lokal sebelum nxnode dipublish**, `npm link` (bukan `file:` di `package.json`) adalah cara yang tepat: `npm link` di folder nxnode (sudah dilakukan sesi sebelumnya), lalu `npm link nxnode` di folder nxdom. Ini membuat symlink lokal tanpa menulis path apa pun ke `package.json` nxdom — begitu nxnode benar-benar dipublish, cukup ganti ke `"nxnode": "^0.1.0"` biasa dan `npm install` ulang, tanpa jejak path lokal yang ikut ter-commit.

---

## 5. Perubahan yang Dibutuhkan di NxNode Sebelum Integrasi

### 5.1 [WAJIB] Hilangkan `process.exit()` di Jalur yang Dipanggil Programmatic

`src/cli/install.js` saat ini memanggil `process.exit(1)` saat `package.json` tidak ditemukan:
```js
if (!root) {
  console.error('[NxNode] Error: No package.json found. Run this command in a project directory.');
  process.exit(1);   // ← akan mematikan seluruh proses nxdom, bukan cuma gagal 1 langkah
}
```
Ini **harus** diganti jadi `throw new Error(...)` supaya nxdom bisa `try/catch` tanpa proses induknya ikut mati. Cek juga `src/cli/update.js`, `src/cli/remove.js`, `src/cli/link.js`, `src/cli/projectCmd.js` untuk pola yang sama — semuanya dipanggil dari `src/cli/index.js` yang memang boleh `process.exit()` (itu benar untuk CLI), tapi kalau modul-modul itu **juga** ingin dipakai programmatic (seperti `install()` sekarang), exit call di dalamnya harus dipisah dari logic intinya.

**Saran konkret:** pisahkan validasi ke level `src/cli/index.js` (CLI wrapper, boleh `process.exit`), dan biarkan fungsi inti (`install()`, dll.) di masing-masing modul `throw` saja. `index.js` yang menangkap lalu `process.exit(1)`.

### 5.2 [OPSIONAL, disarankan] Callback Progress di `install()`

Supaya nxdom bisa mempertahankan UX progress bar yang sudah ada (`onLine`/`onProgress` di `runNpmInstall`), tambahkan parameter opsional `onProgress` ke `install()`:
```js
async function install(packageArg, projectDir, onProgress) {
  onProgress?.({ type: 'resolving', packageName });
  // ...
  onProgress?.({ type: 'downloading', name: dep.name, version: dep.version });
  // ...
}
```
Ini tidak wajib untuk integrasi fungsional pertama (bisa jalan dulu dengan `console.log` biasa), tapi penting untuk paritas UX dengan pengalaman nxdom yang sudah ada.

### 5.3 [OPSIONAL] Fungsi "Install Banyak Package Sekaligus dari package.json"

Karena kebutuhan nxdom adalah "install semua dependency di package.json template sekaligus" (bukan satu-satu seperti alur `nxnode install <pkg>` normal), pertimbangkan tambah fungsi baru di nxnode sendiri:
```js
// src/cli/install.js
async function installAll(projectDir, onProgress) {
  const pkg = project.readPackageJson(projectDir);
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const [name, version] of Object.entries(allDeps)) {
    await install(`${name}@${version}`, projectDir, onProgress);
  }
}
```
Ini juga berguna untuk kasus umum lain (bukan cuma nxdom) — misalnya reproduksi dari `nxnode.lock` atau `package.json` yang sudah ada (mirip `npm install` tanpa argumen). **Catatan:** kalau ditambahkan, ini juga perlu masuk sebagai CLI command baru (`nxnode install` tanpa argumen) supaya konsisten dengan ekspektasi user npm-experienced — tapi itu keputusan terpisah dari kebutuhan integrasi nxdom.

### 5.4 [SELESAI, TERVERIFIKASI] Kompatibilitas Package Native/Platform-Specific

Nxdom membuat project Mobile (Expo/React Native) dan Desktop (Electron) yang sering punya dependency dengan **native binding**. Awalnya nxnode sama sekali tidak menjalankan lifecycle scripts (`preinstall`/`install`/`postinstall`) — ini sudah diimplementasikan penuh (`src/store/lifecycle.js`, opt-in lewat `{ runLifecycleScripts: true }`) dan **diverifikasi dengan package nyata paling berat**: `electron` (download 253MB binary Chromium via `postinstall`) dan `sqlite3` (compile native addon C++ via `node-gyp`) — keduanya berhasil penuh, termasuk uji fungsional nyata (`sqlite3` berhasil `CREATE TABLE`, bukan cuma `require()` sukses).

**Lima bug ditemukan dan diperbaiki selama verifikasi ini** (di luar dugaan awal — ternyata jauh lebih banyak masalah tersembunyi daripada sekadar "belum jalankan lifecycle scripts"):

1. **Lifecycle scripts tidak dijalankan sama sekali** (perbaikan utama) — `src/store/lifecycle.js` baru, dijalankan sekali per package version di dalam folder package di store (bukan di project), ditandai marker `.nxnode-lifecycle-done` supaya tidak re-run.
2. **`.bin/` executable symlink tidak pernah dibuat** — root cause utama kenapa `sqlite3` gagal duluan: `prebuild-install` (dependency `sqlite3`) tidak bisa dipanggil sebagai command karena `node_modules/.bin/` tidak pernah dibuat oleh linker. Diperbaiki di `src/linker/linker.js` (`linkBinEntries`) — baca field `bin` dari `package.json` tiap dependency, buat wrapper `.cmd` (Windows) atau symlink (Unix) di `.bin/`.
3. **Windows `PATH`/`Path` env case-sensitivity bug** — `process.env` case-insensitive di Windows, tapi object spread biasa (`{...process.env, Path: ...}`) menghasilkan **dua key terpisah** (`PATH` asli + `Path` custom), sehingga `cmd.exe` tetap membaca `PATH` asli tanpa folder `.bin` tambahan. Diperbaiki dengan menghapus semua variant case sebelum menambahkan yang baru.
4. **Wildcard version spec `1.0.x`** tidak ter-resolve (`semver.js`) — diperbaiki, sekarang `x`/`X`/`*` di posisi minor/patch di-treat sebagai range `~`/`^`.
5. **npm alias spec `npm:realname@version`** (dipakai `expo` untuk `wrap-ansi-cjs`, dll) — awalnya menyebabkan **crash total** (uncaught exception, bukan cuma warning) saat PoC Mobile pertama kali dicoba. Diperbaiki di 4 file (`dependency-tree.js`, `resolver.js`, `install.js`, `linker.js`) — package disimpan/download dari nama asli (dedup tetap terjaga), di-link ke project dengan nama alias.
6. **Field `os`/`cpu` package.json tidak dihormati** — package platform-specific seperti `fsevents` (macOS-only) dicoba di-install dan gagal compile di Windows, padahal npm normal skip otomatis. Diperbaiki dengan modul baru `src/resolver/platform.js` (`isPlatformCompatible`), dipanggil di `dependency-tree.js` sebelum sebuah dependency dimasukkan ke tree.

**PoC end-to-end final:**
- **Desktop**: `installDesktop(..., { skipDependencies: true })` + `installDependenciesViaNxnode(..., { runLifecycleScripts: true })` — sukses total, `electron` dan `sqlite3` berfungsi penuh dengan native binding utuh.
- **Mobile**: `installMobile(..., { skipDependencies: true })` + `installDependenciesViaNxnode(..., { runLifecycleScripts: true })` — sukses total setelah semua fix di atas (percobaan pertama sebelum fix mengalami crash total karena bug #5). `fsevents` di-skip otomatis dengan benar (bug #6 sudah tidak muncul).

**Catatan performa:** proses instalasi Desktop/Mobile jauh lebih lambat dari Web (belasan menit untuk tree besar seperti `electron-builder`/`expo`) — ini konsisten dengan temuan performa di §7 (network lookup sekuensial ke registry npm, bukan cuma masalah lifecycle scripts).

### 5.5 [WAJIB] Publish NxNode ke npm Registry

Prasyarat mutlak sebelum integrasi apa pun bisa dipakai di rilis nyata `nxdom-cli` (lihat §1 dan §4.3). Langkah-langkah:

1. **Pastikan nama package `nxnode` tersedia di npm** — cek dengan `npm view nxnode` dulu; kalau sudah dipakai package lain, perlu nama alternatif (misal `@scope/nxnode` lewat npm organization scope).
2. **Lengkapi `package.json` nxnode** untuk publish: pastikan `main`/`exports` field mengarah ke entry point yang benar untuk dipakai sebagai library (bukan cuma `bin`), dan tambahkan `files`/`.npmignore` supaya `.store/` (data lokal) tidak ikut ter-publish secara tidak sengaja (lihat `.gitignore` yang sudah dibuat sesi sebelumnya, terapkan pola serupa untuk `.npmignore`).
3. **`npm publish`** — mulai dari versi `0.1.0` sesuai `package.json` saat ini, atau naikkan ke `0.2.0`/`1.0.0` kalau dianggap sudah cukup matang mengingat banyak bug telah diperbaiki sepanjang sesi sebelumnya: integrity check yang dulu tidak menggagalkan install, garbage collection yang salah target, resolver salah resolve bare-version, lockfile yang overwrite (bukan merge) hingga sempat menghapus package terpakai, scoped package (`@scope/name`) yang crash, nested `node_modules` untuk transitive dependency, auto-write ke `package.json`, dan dukungan sintaks `package@version` (lihat §2.4 untuk keterbatasan yang masih tersisa).
4. **Setelah publish**, update `package.json` nxdom: ganti `npm link` development menjadi dependency versi asli (`"nxnode": "^0.1.0"`), lalu `npm install` ulang untuk memverifikasi resolusi dari registry publik berjalan benar (bukan lagi symlink lokal).

**Catatan:** publish ke npm bersifat semi-permanen — begitu sebuah versi ter-publish, ia tidak bisa dihapus sepenuhnya (npm hanya mengizinkan `unpublish` dalam kondisi terbatas, biasanya 72 jam pertama). Sebelum publish pertama, pastikan Fase 1 (§6) — terutama penghilangan `process.exit()` — sudah selesai dan teruji, supaya versi pertama yang publik sudah aman dipakai sebagai library.

---

## 6. Rencana Eksekusi Bertahap

### Fase 1 — Perbaikan NxNode (Prasyarat) — SELESAI
- [x] Ganti `process.exit()` di fungsi inti (`install`, `update`, `remove`, `link`/`unlink`, `list`, `config`, `project create`) jadi `throw Error()`; `process.exit()` kini hanya ada di `src/cli/index.js` (CLI wrapper, menangkap semua `throw` lewat satu `try/catch` terpusat)
- [x] Tambah `installAll(projectDir, onProgress)` di `src/cli/install.js`, plus command CLI baru `nxnode install` tanpa argumen
- [x] Tambah parameter `onProgress` opsional di `install()` — event terstruktur (`{ type, line, ... }`), fallback ke `console.log` kalau tidak diberikan (backward-compatible dengan CLI)
- [x] Buat `src/index.js` sebagai entry point library resmi (**bug ditemukan & diperbaiki**: `package.json` sudah menunjuk `"main": "src/index.js"` sejak awal tapi file itu tidak pernah dibuat — akan gagal total kalau ada yang mencoba `require('nxnode')` sebelum fix ini)

### Fase 2 — Proof of Concept dengan Web Runtime, via `npm link` — SELESAI, BERHASIL
- [x] `npm link` nxnode di nxdom (development lokal, **bukan** `file:` di `package.json`) — terverifikasi `import nxnodePkg from "nxnode"` (default import ESM) berhasil membaca seluruh export CommonJS nxnode
- [x] Buat `src/services/nxnodeBridge.js` di nxdom (dynamic `import()`, bukan static — supaya nxdom tidak gagal load kalau nxnode belum ter-install)
- [x] Sisipkan pemanggilan di `runtimeActions.js` → `executeRuntimeAction()`: untuk `runtime === "web"` saja (scope PoC awal), set `skipDependencies: true` ke `installWeb()`, lalu panggil `installDependenciesViaNxnode()` setelahnya
- [x] Uji coba nyata: `executeRuntimeAction({ runtime: "web", action: "install", projectRoot: ... })` — **berhasil** (`{ ok: true }`), 4 dependency top-level (`cors`, `express`, `http-proxy-middleware`, `kill-port`) + puluhan transitive dependency ter-install lewat nxnode
- [x] Verifikasi: `node server.js` pada project hasil PoC benar-benar **listen dan merespons HTTP 200** (bukan cuma "install sukses" di laporan) — dicek dengan curl nyata ke server yang dijalankan
- [x] **Bug baru ditemukan & diperbaiki selama PoC**: `resolveVersion()` di `src/resolver/resolver.js` dan `src/resolver/dependency-tree.js` tidak menangani version spec wildcard `*` (umum dipakai package `@types/*` di ekosistem TypeScript, contoh nyata: `@types/http-proxy` → `@types/node@*`) — sebelumnya dicoba sebagai versi literal `"*"` dan gagal `Version * not found`. Sekarang `*` diperlakukan sama seperti `latest`.
- [~] Ukur waktu install project kedua dengan template Web yang sama (dependency sudah ada di store): **2 menit 2 detik** — jauh dari instan seperti yang diharapkan. **Temuan penting**: nxnode saat ini tetap melakukan network round-trip (`npm.getVersions()`/`getPackageMetadata()`) ke registry npm untuk **setiap** package guna resolve versi, walau package fisiknya sudah ada di store. Cache hit di store menghindarkan *download* ulang, tapi **tidak** menghindarkan *lookup* registry — ini bottleneck nyata yang jadi pekerjaan lanjutan (lihat §7).
- [ ] **Belum dikerjakan (menunggu arahan user):** publish nxnode ke npm (§5.5) — PoC di atas dilakukan murni via `npm link`, belum publish sama sekali, sesuai instruksi "uji internal dulu sebelum publish npm"

### Fase 3 — Perluas ke Mobile & Desktop — SELESAI, BERHASIL
- [x] Implementasi lifecycle scripts (`preinstall`/`install`/`postinstall`) — `src/store/lifecycle.js`, opt-in lewat `{ runLifecycleScripts: true }`
- [x] Uji package Electron nyata dengan nxnode — **berhasil**, binary 253MB ter-download via `postinstall`, `require('electron')` mengembalikan path exe yang valid
- [x] Uji package sqlite3 nyata dengan nxnode — **berhasil**, native addon C++ ter-compile via `node-gyp`, diverifikasi fungsional (`CREATE TABLE` sungguhan berhasil)
- [x] Uji package Expo/React Native nyata dengan nxnode — **berhasil** setelah serangkaian bug diperbaiki (lihat §5.4 untuk daftar 6 bug: lifecycle scripts, `.bin` linking, PATH case-sensitivity, wildcard version, npm alias, `os`/`cpu` compatibility)
- [x] `src/commands/desktop.js` dan `src/commands/mobile.js` (nxdom) dihubungkan ke nxnode dengan pola sama seperti Web (`skipDependencies: true` + `installDependenciesViaNxnode(..., { runLifecycleScripts: true })`)
- [x] **Bug desain ditemukan & diperbaiki di `mobileInstall.js`**: flag `skipDependencies` awalnya juga men-skip setup modul inti Nxdom (`ensureCoreStyles`, `installMobileRequiredModules`, `regenerateMobileIndex`) yang murni operasi file lokal, tidak ada hubungannya dengan npm — dipisahkan supaya selalu jalan terlepas dari status dependency npm.
- [ ] `linkMode: copy` khusus per-package untuk kasus native binding yang tidak cocok junction/symlink (nxnode sudah mendukung `linkMode` per-config, walau saat ini masih 1 linkMode global, bukan per-package) — **belum diperlukan**, karena kasus nyata (`electron`, `sqlite3`, `node-pty`) sudah terbukti bekerja dengan junction default. Dicatat sebagai potensi kebutuhan masa depan di §7, bukan blocker.

### Fase 4 — Backend Runtime — DI LUAR SCOPE

**Target integrasi ini secara eksplisit hanya tiga runtime: Web, Desktop, Mobile.** Backend (PHP/Laravel-style, `backendInstall.js`) sengaja tidak disentuh — masuk akal karena Backend juga tidak memakai dependency npm sebagai kebutuhan inti (prasyaratnya Composer/PHP, bukan `npm install`, lihat `teknis.md` §"Backend"). Tidak ada pekerjaan tersisa di sini kecuali target integrasi diperluas di masa depan.

### Fase 5 — Dokumentasi & Rollout
- [ ] Update `overview.md`/`teknis.md` nxdom untuk menyebut bahwa dependency npm dikelola lewat nxnode
- [ ] Tambahkan troubleshooting: cara cek status store (`nxnode store`, `nxnode store projects`), cara pindah lokasi store, cara `store clean` aman
- [ ] Sosialisasi ke alur kerja: `nxnode doctor` sebagai langkah pertama debug kalau ada masalah dependency di project hasil nxdom

---

## 7. Pekerjaan Lanjutan (Di Luar Scope Integrasi Awal)

Dicatat sebagai potensi peningkatan nxnode yang relevan tapi tidak wajib untuk integrasi pertama:

- **[TEMUAN PoC, PRIORITAS TINGGI, MASIH TERBUKA] Cache hit di store tidak menghindarkan network lookup ke registry npm** — install project kedua dengan dependency tree yang identik (semua package sudah fisik ada di store) tetap butuh **2 menit 2 detik** untuk Web, dan puluhan menit untuk Desktop/Mobile (tree jauh lebih besar: `electron-builder`, `expo`), karena `resolveVersion()` memanggil `npm.getVersions()`/`getPackageMetadata()` ke registry untuk **setiap** package guna menentukan versi konkret, terlepas dari apakah package itu sudah ada di store atau belum — ditambah lagi sekarang `dependency-tree.js` juga memanggil `getPackageMetadata()` untuk cek `os`/`cpu` compatibility (§5.4 poin 6), jadi jumlah network call per package justru bertambah. Optimasi yang masuk akal: kalau `versionSpec` sudah exact match dengan versi yang **sudah tersimpan** di store (dan metadata `os`/`cpu`-nya sudah pernah dicek), lewati network call sepenuhnya. Ini paling berdampak untuk kasus nxdom — banyak project dibuat dari template yang sama, jadi ini persis skenario yang paling sering terjadi.
- **`linkMode` per-package** (bukan cuma global) — untuk menangani kasus package native binding yang tidak cocok di-junction/symlink, sementara mayoritas package lain tetap pakai junction. Belum terbukti diperlukan (§5.4), tapi dicatat untuk jaga-jaga kalau ada package lain yang bermasalah di masa depan.
- ~~Lifecycle scripts (`postinstall`, `prepare`)~~ — **SELESAI**, lihat §5.4.
- ~~Field `os`/`cpu` compatibility~~ — **SELESAI**, lihat §5.4 poin 6.

---

## 8. Ringkasan Keputusan

| Pertanyaan | Jawaban |
|---|---|
| Integrasi lewat CLI spawn atau library call? | **Library call** (`require`/`import` langsung) — lebih cepat, lebih mudah kontrol error, nxnode sudah mengexport fungsi yang siap pakai |
| Ubah 4 file service nxdom atau sentralisasi? | **Sentralisasi di `runtimeActions.js`** (Opsi C) — pakai flag `skipDependencies` yang sudah ada, minim risiko regresi |
| Scope integrasi mencakup runtime apa saja? | **Hanya Web, Desktop, Mobile** — ini target yang ditetapkan sejak awal. Backend (PHP/Composer) sengaja tidak termasuk karena tidak bergantung pada npm sama sekali (§1, §6 Fase 4) |
| Mulai dari runtime mana? | **Web** dulu (risiko rendah), baru Desktop & Mobile setelah verifikasi native binding — ketiganya **sudah selesai** sekarang |
| Apa yang wajib diperbaiki di nxnode dulu? | Hilangkan `process.exit()` di fungsi inti — tanpa ini, integrasi bisa mematikan proses nxdom saat terjadi error. **Selesai** (Fase 1) |
| Nxnode dirujuk lewat path lokal (`file:`) atau nama package npm? | **Wajib nama package npm** (`"nxnode": "^x.y.z"`) untuk rilis nyata — nxdom-cli sudah dipublish publik (~1.057 download/minggu) dan juga dibangun sebagai `nxdom.exe` via esbuild bundling; path lokal (`file:../nxnode`) hanya bekerja di mesin developer ini. `npm link` dipakai untuk seluruh uji internal (§4.3, §5.5) — **belum publish**, sesuai arahan eksplisit "uji internal dulu sebelum publish npm" |
| Kapan boleh publish ke npm? | Setelah semua fase uji internal (1–3) selesai dan terverifikasi — **sudah terpenuhi secara teknis**, tapi publish itu sendiri masih menunggu keputusan/arahan eksplisit user, belum dilakukan |
| Status saat ini (setelah uji internal)? | **Ketiga runtime target (Web, Desktop, Mobile) selesai dan terverifikasi berhasil** lewat `npm link`, belum publish ke npm. Web: server nyata listen & merespons HTTP 200. Desktop: `electron` (253MB binary) dan `sqlite3` (native addon, `CREATE TABLE` berhasil) berfungsi penuh. Mobile: seluruh tree `expo` ter-install tanpa crash. **9 bug ditemukan & diperbaiki** sepanjang proses (lihat §2.4, §5.4 untuk daftar lengkap): entry point library hilang, wildcard version, npm alias (sempat bikin crash total), `.bin` linking hilang, Windows PATH case-sensitivity, `os`/`cpu` compatibility, dan bug desain `skipDependencies` di `mobileInstall.js`. **Satu isu performa masih terbuka** (§7, prioritas tinggi): cache hit di store belum menghindarkan network lookup registry npm, membuat instalasi ulang dependency identik tetap lambat — signifikan untuk Desktop/Mobile (belasan menit), bukan cuma Web (~2 menit). |
