# NxNode — Materi Website (Landing Page)

> Dokumen ini berisi materi konten siap pakai untuk landing page NxNode.
> Format: setiap blok ditulis dua bahasa — **ID** (Indonesia) lalu **EN** (English).
> Semua klaim di dokumen ini mengikuti perilaku nyata di `src/` (lihat `README.md`, `GUIDE.md`, `integrasi.md`).

---

## 0. Metadata Halaman

**ID**

- **Title:** NxNode — Satu Store, Semua Project Node.js
- **Meta description:** NxNode adalah package manager Node.js dengan Global Store bersama. Satu salinan `express` dipakai lintas semua project — hemat disk, hemat waktu install, tanpa mengubah cara kerja `package.json`.
- **Kata kunci:** package manager, node_modules, global store, junction, symlink, deduplikasi, npm registry

**EN**

- **Title:** NxNode — One Store, Every Node.js Project
- **Meta description:** NxNode is a Node.js package manager backed by a shared Global Store. One copy of `express` serves every project — less disk, faster installs, no change to how your `package.json` works.
- **Keywords:** package manager, node_modules, global store, junction, symlink, deduplication, npm registry

---

## 1. Navbar

**ID**

- Nav: Mulai · Fitur · Cara Kerja · Perintah · Integrasi · FAQ
- Tombol: Mulai Sekarang
- Tautan sekunder: Dokumentasi

**EN**

- Nav: Get Started · Features · How It Works · Commands · Integration · FAQ
- Button: Get Started
- Secondary link: Documentation

---

## 2. Hero

**ID**

**Headline:** Satu Store untuk Semua Project Node.js Anda.

**Subheadline:** NxNode menyatukan package yang sama dari banyak project ke satu **Global Package Store**. Tidak ada lagi salinan `express`, `axios`, atau `lodash` yang berulang di setiap `node_modules`. Project tetap punya `package.json` sendiri, tapi package fisiknya cukup satu.

**CTA utama:** Mulai Sekarang
**CTA sekunder:** Lihat Cara Kerjanya
**Badge:** v0.1.0 · Node.js ≥ 18 · MIT · Windows-first

**Sorotan singkat (3 poin):**

- **Hemat disk** — package identik disimpan satu kali, bukan sekali per project.
- **Hemat waktu** — project kedua dengan dependency yang sama tidak download ulang.
- **Tetap kompatibel** — struktur `node_modules` tetap standar Node.js, fallback otomatis ke `copy` bila linking gagal.

**EN**

**Headline:** One Store for All Your Node.js Projects.

**Subheadline:** NxNode consolidates identical packages from many projects into a single **Global Package Store**. No more duplicated `express`, `axios`, or `lodash` in every `node_modules`. Each project keeps its own `package.json`, but there is only one physical copy.

**Primary CTA:** Get Started
**Secondary CTA:** See How It Works
**Badge:** v0.1.0 · Node.js ≥ 18 · MIT · Windows-first

**Quick highlights:**

- **Saves disk** — identical packages stored once, not once per project.
- **Saves time** — a second project with the same dependencies skips re-download.
- **Stays compatible** — `node_modules` keeps the standard Node.js layout, with automatic fallback to `copy` when linking fails.

---

## 2.1 Mulai Cepat (Quick Start)

**ID**

**1. Jalankan NxNode dari source** — belum dipublikasikan ke npm, jalankan langsung dari folder instalasi:

```bash
cd D:\Framework\CLI\nxnode
npm install
node bin/nxnode.js --help
```

Atau link agar tersedia sebagai perintah global:

```bash
npm link
nxnode --version
```

**2. Buat project & pasang package** — jalankan di folder project yang punya `package.json`:

```bash
nxnode project create my-project
nxnode install express
nxnode install lodash

nxnode list
```

Pasang semua dependency sekaligus tanpa argumen:

```bash
nxnode install
```

**EN**

**1. Run NxNode from source** — not published to npm yet, run it straight from the install folder:

```bash
cd D:\Framework\CLI\nxnode
npm install
node bin/nxnode.js --help
```

Or link it so it is available as a global command:

```bash
npm link
nxnode --version
```

**2. Create a project & install packages** — run inside a project folder that has a `package.json`:

```bash
nxnode project create my-project
nxnode install express
nxnode install lodash

nxnode list
```

Install every dependency at once with no argument:

```bash
nxnode install
```

---

## 3. Masalah & Solusi

**ID**

**Masalah:** Banyak project Node.js menyimpan package yang identik secara fisik berkali-kali.

```text
Project A1            Project A2
└── node_modules      └── node_modules
    ├── express           ├── express   ← duplikat
    ├── axios             ├── axios     ← duplikat
    └── ws                └── sharp
```

**Solusi NxNode:** package dipindahkan ke store bersama, dan setiap project hanya menyediakan **link** (junction/symlink) menuju store.

```text
        Project A1 ─┐
        Project A2 ─┼──→  D:\NxNodeStore
        Project A3 ─┘      (satu salinan express@5.1.0)
```

**EN**

**The problem:** Many Node.js projects keep physically identical packages over and over.

```text
Project A1            Project A2
└── node_modules      └── node_modules
    ├── express           ├── express   ← duplicate
    ├── axios             ├── axios     ← duplicate
    └── ws                └── sharp
```

**The NxNode solution:** packages move into a shared store, and each project only holds a **link** (junction/symlink) into it.

```text
        Project A1 ─┐
        Project A2 ─┼──→  D:\NxNodeStore
        Project A3 ─┘      (a single copy of express@5.1.0)
```

---

## 4. Fitur Utama

**ID**

1. **Global Package Store** — satu lokasi fisik untuk semua package, di-drive atau folder mana pun. Lokasi default: folder `.store` di dalam instalasi NxNode, bisa diubah kapan saja.
2. **Dedup lintas project** — package yang sama cukup di-download sekali; project lain langsung memakai salinan yang sudah ada.
3. **Multi-versi berdampingan** — `express@4` dan `express@5` bisa hidup berdampingan tanpa saling menimpa. Bahkan dua versi dari package yang sama bisa muncul dalam satu dependency tree, dan tetap disimpan terpisah.
4. **Resolusi dependency transitif** — seluruh transitive dependency (mis. `body-parser`, `qs`, `send` untuk `express`) ikut di-resolve dan di-link bersarang di dalam store, sehingga `require()` tetap berhasil.
5. **Integrity verification** — setiap tarball diverifikasi SHA-512 terhadap metadata npm sebelum disimpan. Kalau tidak cocok, install dibatalkan.
6. **Lock file reproducibility** — `nxnode.lock` bersifat kumulatif (di-merge antar-install), sehingga instalasi bisa direproduksi dan `store clean` tidak salah hapus.
7. **Scoped package** — mendukung `@scope/name` dengan struktur `node_modules` standar Node.js, sementara penyimpanan internalnya di-encode agar tetap satu folder valid.
8. **Empat mode linking** — `junction` (default Windows, tanpa admin), `symlink`, `hardlink`, dan `copy` sebagai fallback otomatis.
9. **Garbage collection aman** — `nxnode store clean` hanya menghapus package yang tidak dipakai project terdaftar; kalau belum ada project terdaftar, cleanup dilewati demi keamanan.
10. **Bisa dipakai sebagai library** — `require('nxnode')` mengekspos fungsi seperti `install()`, `installAll()`, `store`, `resolver`, dan `linker` untuk dipanggil langsung dari kode program.

**EN**

1. **Global Package Store** — one physical location for all packages, on any drive or folder. Default location: a `.store` folder inside the NxNode installation; changeable at any time.
2. **Cross-project dedup** — a package is downloaded once; every other project reuses the existing copy.
3. **Side-by-side versions** — `express@4` and `express@5` coexist without overwriting each other. Even two versions of the same package can appear within a single dependency tree and are still stored separately.
4. **Transitive dependency resolution** — the full transitive tree (e.g. `body-parser`, `qs`, `send` for `express`) is resolved and linked as nested `node_modules` inside the store, so `require()` keeps working.
5. **Integrity verification** — every tarball is checked with SHA-512 against the npm metadata before being stored. If it does not match, the install is aborted.
6. **Reproducible lock file** — `nxnode.lock` is cumulative (merged across installs), enabling reproducible installs and preventing `store clean` from deleting the wrong packages.
7. **Scoped packages** — supports `@scope/name` with the standard Node.js `node_modules` layout, while the internal store encoding keeps it as a single valid folder.
8. **Four linking modes** — `junction` (Windows default, no admin needed), `symlink`, `hardlink`, and `copy` as an automatic fallback.
9. **Safe garbage collection** — `nxnode store clean` only removes packages unused by registered projects; if no project is registered yet, cleanup is skipped for safety.
10. **Usable as a library** — `require('nxnode')` exposes functions such as `install()`, `installAll()`, `store`, `resolver`, and `linker` for direct programmatic use.

---

## 5. Cara Kerja (3 Langkah)

**ID**

1. **Install** — jalankan `nxnode install express` di project mana pun. NxNode membaca `package.json`, me-resolve versi dari npm, lalu mengecek store.
2. **Store atau Link** — kalau `express@5.1.0` belum ada di store, paket di-download, diverifikasi SHA-512, lalu disimpan. Kalau sudah ada, download dilewati sepenuhnya.
3. **Link** — NxNode membuat junction/symlink dari store ke `node_modules` project. Project lain yang butuh versi sama langsung memakai ulang salinan yang sama.

**Diagram alur:**

```text
              nxnode install express
                        │
                        ▼
                 Baca package.json
                        │
                        ▼
                 Resolve versi
                        │
                        ▼
              Cek Global Package Store
                   /          \
                 ADA         TIDAK ADA
                  │              │
                  ▼              ▼
                Link          Download
                                 │
                                 ▼
                          Verify + Store
                                 │
                                 ▼
                               Link
```

**EN**

1. **Install** — run `nxnode install express` in any project. NxNode reads `package.json`, resolves the version from npm, then checks the store.
2. **Store or link** — if `express@5.1.0` is not in the store yet, the package is downloaded, SHA-512 verified, then stored. If it already exists, the download is skipped entirely.
3. **Link** — NxNode creates a junction/symlink from the store into the project's `node_modules`. Any other project needing the same version reuses the same copy instantly.

**Flow diagram:**

```text
              nxnode install express
                        │
                        ▼
                 Read package.json
                        │
                        ▼
                 Resolve version
                        │
                        ▼
              Check Global Package Store
                   /          \
                EXISTS       MISSING
                  │              │
                  ▼              ▼
                Link          Download
                                 │
                                 ▼
                          Verify + Store
                                 │
                                 ▼
                               Link
```

---

## 6. Demo Terminal (Install Pertama vs Kedua)

**ID**

Install pertama (project A1) — package belum ada di store:

```text
$ nxnode install express

[NxNode] Resolving express...
[NxNode] Required version: 5.1.0
[NxNode] Added express@^5.1.0 in package.json
[NxNode] Building dependency tree...
[NxNode] Found 57 packages

[NxNode] Downloading express@5.1.0...
[NxNode] Linking transitive dependencies inside store...
[NxNode] Linking packages...

✓ express@5.1.0 installed with 57 packages
```

Install kedua (project A2) — package sudah ada, tidak download ulang:

```text
$ nxnode install express

[NxNode] Resolving express...
[NxNode] Required version: 5.1.0
[NxNode] express@5.1.0 found in store
[NxNode] Linking existing package...

✓ express@5.1.0 linked
```

**EN**

First install (project A1) — package not yet in the store:

```text
$ nxnode install express

[NxNode] Resolving express...
[NxNode] Required version: 5.1.0
[NxNode] Added express@^5.1.0 in package.json
[NxNode] Building dependency tree...
[NxNode] Found 57 packages

[NxNode] Downloading express@5.1.0...
[NxNode] Linking transitive dependencies inside store...
[NxNode] Linking packages...

✓ express@5.1.0 installed with 57 packages
```

Second install (project A2) — package already cached, no re-download:

```text
$ nxnode install express

[NxNode] Resolving express...
[NxNode] Required version: 5.1.0
[NxNode] express@5.1.0 found in store
[NxNode] Linking existing package...

✓ express@5.1.0 linked
```

---

## 7. Referensi Perintah

**ID**

| Perintah | Fungsi |
|---|---|
| `nxnode install` | Install semua dependency dari `package.json` |
| `nxnode install <package>` | Install satu package beserta dependency-nya (auto-tulis ke `package.json`) |
| `nxnode install <package>@<version>` | Install versi tertentu, menimpa yang ada di `package.json` |
| `nxnode remove <package>` | Hapus package dari project |
| `nxnode update <package>` | Update package ke versi terbaru dalam range yang dideklarasikan |
| `nxnode link` | Link semua dependency dari store |
| `nxnode unlink` | Unlink semua dependency |
| `nxnode list` | Tampilkan dependency lokal dan status link-nya |
| `nxnode list --global` | Tampilkan package di global store |
| `nxnode store` | Tampilkan info store |
| `nxnode store path` | Tampilkan lokasi store |
| `nxnode store clean` | Hapus package yang tidak terpakai |
| `nxnode store projects` | Daftar project terdaftar yang memakai store ini |
| `nxnode config` | Tampilkan konfigurasi |
| `nxnode config <key> <value>` | Ubah konfigurasi (`storePath` / `linkMode`) |
| `nxnode project create <name>` | Buat project baru |
| `nxnode doctor` | Cek status sistem |
| `nxnode --version` / `-v` | Tampilkan versi |
| `nxnode --help` / `-h` | Tampilkan bantuan |

> **Catatan PowerShell:** `^` adalah escape character. Selalu tulis versi menempel tanpa spasi (`nxnode install pkg@^1.2.3`) atau bungkus dengan tanda kutip (`nxnode install "pkg@^1.2.3"`).

**EN**

| Command | Purpose |
|---|---|
| `nxnode install` | Install all dependencies from `package.json` |
| `nxnode install <package>` | Install one package with its dependencies (auto-writes to `package.json`) |
| `nxnode install <package>@<version>` | Install a specific version, overriding `package.json` |
| `nxnode remove <package>` | Remove a package from the project |
| `nxnode update <package>` | Update to the newest version within the declared range |
| `nxnode link` | Link all dependencies from the store |
| `nxnode unlink` | Unlink all dependencies |
| `nxnode list` | List local dependencies and their link status |
| `nxnode list --global` | List packages in the global store |
| `nxnode store` | Show store info |
| `nxnode store path` | Show the store path |
| `nxnode store clean` | Remove unused packages |
| `nxnode store projects` | List projects registered against this store |
| `nxnode config` | Show configuration |
| `nxnode config <key> <value>` | Set configuration (`storePath` / `linkMode`) |
| `nxnode project create <name>` | Create a new project |
| `nxnode doctor` | Check system status |
| `nxnode --version` / `-v` | Show version |
| `nxnode --help` / `-h` | Show help |

> **PowerShell note:** `^` is an escape character. Always attach the version without a space (`nxnode install pkg@^1.2.3`) or quote the whole argument (`nxnode install "pkg@^1.2.3"`).

---

## 8. Mode Linking

**ID**

| Mode | Keterangan |
|---|---|
| `junction` | Default di Windows. Bekerja lintas drive, tanpa privilege admin. Direkomendasikan. |
| `symlink` | Symbolic link. Bekerja lintas drive, tapi di Windows bisa butuh Administrator atau Developer Mode. |
| `hardlink` | Hard link per file. Performa terbaik, harus satu drive; fallback ke copy untuk direktori. |
| `copy` | Menyalin file fisik. Tanpa privilege khusus, tapi memakai disk lebih banyak. |

Jika linking gagal, NxNode otomatis fallback ke `copy` sehingga install tetap berhasil. Status link per-package bisa dilihat lewat `nxnode list`:

```text
express@^5.1.0   [linked (junction) -> D:\NxNodeStore\packages\express\5.1.0\package]
lodash@^4.17.0   [copied -> D:\NxNodeStore\packages\lodash\4.17.0\package]
```

**EN**

| Mode | Description |
|---|---|
| `junction` | Windows default. Works across drives, no admin privilege needed. Recommended. |
| `symlink` | Symbolic link. Works across drives, but may need Administrator or Developer Mode on Windows. |
| `hardlink` | Per-file hard links. Best performance, same drive only; falls back to copy for directories. |
| `copy` | Physically copies files. No special privileges, but uses more disk space. |

If linking fails, NxNode automatically falls back to `copy`, so installs still succeed. Per-package link status is visible via `nxnode list`:

```text
express@^5.1.0   [linked (junction) -> D:\NxNodeStore\packages\express\5.1.0\package]
lodash@^4.17.0   [copied -> D:\NxNodeStore\packages\lodash\4.17.0\package]
```

---

## 9. Konfigurasi

**ID**

- **File config:** `%USERPROFILE%\.nxnode\config.json`
- **Store default:** folder `.store` di dalam instalasi NxNode (mis. `D:\Framework\CLI\nxnode\.store`)

```json
{
  "storePath": "D:\\NxNodeStore",
  "linkMode": "junction"
}
```

Ubah lewat CLI:

```powershell
nxnode config storePath E:\MyPackages
nxnode config linkMode copy
```

**EN**

- **Config file:** `%USERPROFILE%\.nxnode\config.json`
- **Default store:** a `.store` folder inside the NxNode installation (e.g. `D:\Framework\CLI\nxnode\.store`)

```json
{
  "storePath": "D:\\NxNodeStore",
  "linkMode": "junction"
}
```

Change via CLI:

```powershell
nxnode config storePath E:\MyPackages
nxnode config linkMode copy
```

---

## 10. Integrasi (NxDOM)

**ID**

NxNode dipakai sebagai **library**, bukan dengan memanggil CLI lewat `spawn`. NxDOM (CLI scaffolding Web/Desktop/Mobile) memakai pola `skipDependencies: true` lalu memanggil `installDependenciesViaNxnode()`, sehingga dependency npm semua project yang digenerate berbagi satu Global Store yang sama.

- **Web** — template Express (`cors`, `express`, `http-proxy-middleware`, `kill-port` + transitive) terpasang lewat NxNode; server hasilnya terverifikasi listen dan merespons HTTP 200.
- **Desktop** — `electron` (binary ~253 MB via postinstall) dan `sqlite3` (native addon, `CREATE TABLE` berhasil) berfungsi penuh. Lifecycle scripts opt-in lewat `{ runLifecycleScripts: true }`.
- **Mobile** — seluruh tree `expo` ter-install tanpa crash; field `os`/`cpu` dihormati (package seperti `fsevents` otomatis di-skip di Windows).

Perubahan perilaku pada project yang sudah ada tetap kompatibel: project tetap punya `package.json`, dan bisa memaksa mode `copy` bila ada tool yang tidak cocok dengan link.

**EN**

NxNode is used as a **library**, not by `spawn`-ing the CLI. NxDOM (a Web/Desktop/Mobile scaffolding CLI) uses the `skipDependencies: true` pattern and then calls `installDependenciesViaNxnode()`, so every generated project's npm dependencies share the same Global Store.

- **Web** — the Express template (`cors`, `express`, `http-proxy-middleware`, `kill-port` plus transitive) installs through NxNode; the resulting server was verified to listen and respond with HTTP 200.
- **Desktop** — `electron` (a ~253 MB postinstall binary) and `sqlite3` (a native addon, `CREATE TABLE` succeeded) work fully. Lifecycle scripts are opt-in via `{ runLifecycleScripts: true }`.
- **Mobile** — the entire `expo` tree installs without crashing; `os`/`cpu` fields are honored (packages like `fsevents` are skipped on Windows).

Behavior changes stay compatible with existing projects: each project keeps its `package.json`, and can force `copy` mode if a tool is unhappy with links.

**Dipakai sebagai library / Used as a library**

```js
// Node CommonJS — panggil langsung tanpa spawn CLI
const nxnode = require('nxnode');

await nxnode.install('express@^5.1.0', projectRoot, onProgress);
await nxnode.installAll(projectRoot);          // semua dependency di package.json
console.log(nxnode.store.getStorePath());       // lokasi Global Store
```

---

## 11. Kompatibilitas & Catatan

**ID**

- **Node.js ≥ 18**, ditulis dalam JavaScript murni (CommonJS).
- **Windows-first** (junction sebagai default), dengan dukungan symlink/hardlink/copy lintas platform.
- **Tool yang mengasumsikan salinan fisik** (beberapa bundler, backup/sync seperti OneDrive) bisa memperlakukan link secara berbeda — gunakan `linkMode: copy` untuk project tersebut.
- **Jangan pindahkan folder store manual** — junction menyimpan path absolut. Ubah lewat `nxnode config storePath` lalu install ulang, jangan copy/pindah foldernya.
- **Belum dipublikasikan ke npm** — saat ini dijalankan dari source (`node bin/nxnode.js`) atau lewat `npm link`.

**EN**

- **Node.js ≥ 18**, written in plain JavaScript (CommonJS).
- **Windows-first** (junction by default), with cross-platform symlink/hardlink/copy support.
- **Tools that assume real physical copies** (some bundlers, backup/sync like OneDrive) may treat links differently — use `linkMode: copy` for those projects.
- **Never move the store folder manually** — junctions store absolute paths. Change it via `nxnode config storePath` and reinstall; do not copy/move the folder.
- **Not yet published to npm** — currently run from source (`node bin/nxnode.js`) or via `npm link`.

---

## 12. FAQ

**ID**

**Apakah saya harus menghapus `package.json`?**
Tidak. `package.json` tetap menjadi sumber kebutuhan dependency per project. NxNode hanya mengubah cara package fisik disimpan dan di-link.

**Bagaimana kalau dua project butuh versi berbeda?**
Tidak masalah. Setiap versi disimpan di folder terpisah (`express/4.21.2` dan `express/5.1.0`). Isolasi versi tetap terjaga.

**Apakah package di-download ulang untuk project kedua?**
Tidak, selama versi yang diminta sudah ada di store. Download dilewati dan NxNode langsung membuat link.

**Apa yang terjadi kalau linking tidak didukung?**
NxNode otomatis fallback ke `copy`, sehingga install tetap berhasil, walau tanpa dedup fisik untuk project itu.

**Apakah `store clean` bisa menghapus package yang masih dipakai?**
Tidak untuk project terdaftar. Cleanup hanya mempertimbangkan project yang pernah menjalankan `install`/`project create`. Kalau belum ada project terdaftar, cleanup dilewati.

**Bisakah dipakai dari kode, bukan CLI?**
Bisa. `require('nxnode')` mengekspos `install`, `installAll`, `store`, `registry`, `lockfile`, `project`, `config`, `resolver`, dan `linker`.

**EN**

**Do I have to delete `package.json`?**
No. `package.json` remains the per-project source of dependency needs. NxNode only changes how packages are physically stored and linked.

**What if two projects need different versions?**
That is fine. Each version lives in its own folder (`express/4.21.2` and `express/5.1.0`). Version isolation is preserved.

**Does the second project re-download packages?**
No, as long as the requested version is already in the store. The download is skipped and NxNode links directly.

**What happens if linking is unsupported?**
NxNode automatically falls back to `copy`, so the install still succeeds — just without physical dedup for that project.

**Can `store clean` delete packages still in use?**
Not for registered projects. Cleanup only considers projects that have run `install`/`project create`. If none are registered, cleanup is skipped.

**Can I use it from code instead of the CLI?**
Yes. `require('nxnode')` exposes `install`, `installAll`, `store`, `registry`, `lockfile`, `project`, `config`, `resolver`, and `linker`.

---

## 13. CTA Penutup

**ID**

**Headline:** Berhenti menyimpan `node_modules` berkali-kali.
**Subheadline:** Pasang sekali, pakai di semua project. NxNode membuat dedup package jadi bawaan, bukan tambahan.
**Tombol:** Mulai Sekarang · Baca Dokumentasi

**EN**

**Headline:** Stop storing `node_modules` over and over.
**Subheadline:** Install once, use everywhere. NxNode makes package dedup built-in, not bolted on.
**Buttons:** Get Started · Read the Docs

---

## 14. Footer

**ID**

- Produk: Fitur · Cara Kerja · Perintah · Integrasi
- Sumber: `README.md` · `GUIDE.md` · `CHANGELOG.md` · `Plan.md`
- Lisensi: MIT · Versi 0.1.0

**EN**

- Product: Features · How It Works · Commands · Integration
- Source: `README.md` · `GUIDE.md` · `CHANGELOG.md` · `Plan.md`
- License: MIT · Version 0.1.0
