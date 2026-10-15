# NxNode Package Manager

> **NxNode** — Shared Node.js Package Store & Project Dependency Manager

## 1. Tujuan

NxNode adalah package manager berbasis Node.js yang dirancang untuk mengurangi duplikasi package pada banyak proyek Node.js.

Masalah utama yang ingin diselesaikan:

```text
Project A1
└── node_modules
    ├── express
    ├── axios
    └── ws

Project A2
└── node_modules
    ├── express   ← duplikat
    ├── axios     ← duplikat
    └── sharp
```

Jika banyak proyek menggunakan dependency yang sama, package secara fisik dapat tersimpan berulang kali.

NxNode menggunakan konsep:

```text
Global Package Store
        ↓
Dependency Resolver
        ↓
Project Linker
        ↓
Project di lokasi mana pun
```

---

# 2. Konsep Utama

NxNode memisahkan:

1. **Project**
2. **Package Store**
3. **Dependency Metadata**
4. **Linker**

Package sebenarnya disimpan di Global Store.

Project hanya memiliki dependency sesuai kebutuhan `package.json` dan link menuju package yang berada di store.

---

# 3. Lokasi Project Bebas

NxNode tidak mengharuskan semua project berada di satu direktori.

Contoh:

```text
D:\IDE\Project-A1
C:\Users\Iyan\Documents\Project-A2
E:\Development\Project-A3
F:\Web\Project-A4
```

Semua project dapat menggunakan Global Store yang sama.

Contoh:

```text
D:\NxNodeStore
```

Maka:

```text
D:\IDE\Project-A1
        ↓
D:\NxNodeStore

E:\Development\Project-A2
        ↓
D:\NxNodeStore

F:\Web\Project-A3
        ↓
D:\NxNodeStore
```

Lokasi project tidak berpengaruh terhadap lokasi package store.

---

# 4. Global Package Store

Struktur dasar:

```text
D:\NxNodeStore
│
├── packages
│   ├── express
│   │   └── 5.1.0
│   │
│   ├── axios
│   │   └── 1.11.0
│   │
│   ├── ws
│   │   └── 8.18.3
│   │
│   └── sharp
│       └── 0.34.3
│
├── metadata
│
├── cache
│
└── indexes
```

Package hanya perlu di-download ketika versi tersebut belum tersedia.

## 4.1 Scoped Package (`@scope/name`)

NxNode mendukung scoped package seperti `@xterm/xterm`. Karena nama package ini mengandung `/`, penyimpanan fisik di dalam `packages/` di-encode agar tetap satu folder valid (bukan nested), sedangkan struktur `node_modules` di project tetap mengikuti konvensi Node.js yang sesungguhnya (`node_modules/@scope/name`):

```text
Store (internal, di-encode):
<storePath>\packages\@xterm+xterm\5.5.0\package

Project node_modules (struktur asli Node.js):
node_modules\@xterm\xterm  →  <storePath>\packages\@xterm+xterm\5.5.0\package
```

Encoding ini murni detail internal penyimpanan — perintah seperti `nxnode install @xterm/xterm`, `nxnode list`, dan `nxnode remove @xterm/xterm` tetap menggunakan nama asli package apa adanya.

---

# 5. Contoh Banyak Project

## Project A1

```text
D:\IDE\Project-A1
│
├── package.json
└── node_modules
    ├── express
    ├── axios
    └── ws
```

## Project A2

```text
E:\Development\Project-A2
│
├── package.json
└── node_modules
    ├── express
    ├── axios
    └── sharp
```

## Project A3

```text
F:\Web\Project-A3
│
├── package.json
└── node_modules
    ├── express
    └── ws
```

Ketiga project dapat menggunakan package fisik yang sama:

```text
D:\NxNodeStore
├── express@5.1.0
├── axios@1.11.0
├── ws@8.18.3
└── sharp@0.34.3
```

---

# 6. Linking

NxNode tidak harus menyalin package ke setiap project.

Contoh:

```text
Project A1
node_modules/express
        │
        └──────→ D:\NxNodeStore\packages\express\5.1.0
```

Project A2:

```text
Project A2
node_modules/express
        │
        └──────→ D:\NxNodeStore\packages\express\5.1.0
```

Project A3:

```text
Project A3
node_modules/express
        │
        └──────→ D:\NxNodeStore\packages\express\5.1.0
```

Dengan demikian hanya ada satu salinan package secara fisik.

## 6.1 Transitive Dependency Juga Di-link Bersarang

Package seperti `express` sendiri butuh banyak dependency lain (`body-parser`, `qs`, `send`, dst). Karena `node_modules/express` di project adalah junction/symlink ke folder di Global Store, Node.js akan mencari dependency `express` mulai dari **lokasi asli file itu di store**, bukan dari `node_modules` project.

Supaya `require('express')` tetap berhasil menemukan `body-parser` dkk, NxNode membuat `node_modules` bersarang **di dalam folder package itu sendiri di dalam store**:

```text
D:\NxNodeStore\packages\express\5.1.0\package\
├── lib\
├── index.js
└── node_modules\              ← dibuat otomatis oleh NxNode
    ├── body-parser  → D:\NxNodeStore\packages\body-parser\2.2.0\package
    ├── qs           → D:\NxNodeStore\packages\qs\6.14.0\package
    └── ... (semua direct dependency express)
```

Karena node_modules bersarang ini letaknya di dalam store (bukan di dalam project), semua project yang memakai `express@5.1.0` otomatis berbagi struktur nested yang sama — dedup tetap terjaga, tidak ada duplikasi per-project.

---

# 7. Dependency Tetap Milik Project

Global Store bukan pengganti `package.json`.

Setiap project tetap mempunyai dependency sendiri.

## 7.1 `nxnode install` Otomatis Mencatat ke `package.json`

Kalau package yang di-install belum ada di `dependencies`, NxNode menambahkannya otomatis dengan versi yang ter-resolve (format `^<version>`):

```powershell
nxnode install lodash
```

```text
[NxNode] Resolving lodash...
[NxNode] Required version: 4.18.1
[NxNode] Added lodash@^4.18.1 to package.json
...
```

Kalau package **sudah** ada di `dependencies` (misalnya sudah ditulis manual dengan range tertentu), NxNode tidak menimpanya — versi spec yang sudah ada tetap dipakai apa adanya untuk resolusi.

Ini penting untuk konsistensi: karena command seperti `nxnode update <package>` dan `nxnode store clean` membaca `package.json`/`nxnode.lock` untuk menentukan dependency yang valid, package yang ter-install tapi tidak tercatat di `package.json` tidak akan bisa di-`update` (akan muncul error "is not a dependency in this project").

## 7.2 Memilih Versi Langsung Lewat CLI (`package@version`)

Seperti npm, kamu bisa menentukan versi langsung saat install tanpa perlu edit `package.json` lebih dulu:

```powershell
nxnode install adm-zip@^0.5.17
nxnode install @xterm/xterm@5.5.0
```

Versi yang diminta di sini **menimpa** apa pun yang sudah tercatat di `package.json` untuk package tersebut. Kalau argumen tidak mengandung versi (`nxnode install adm-zip`), NxNode memakai spec yang sudah ada di `package.json` (kalau ada), atau `latest` dari npm registry (kalau package belum pernah dicatat).

Catatan untuk scoped package (`@scope/name`): parsing versi mencari karakter `@` **setelah** posisi pertama, sehingga `@` di awal nama scope tidak disalahartikan sebagai pemisah versi.

> **Catatan PowerShell:** karakter `^` adalah escape character di PowerShell (line continuation), sehingga `nxnode install pkg ^0.5.17` (dua argumen terpisah dengan spasi) **tidak berfungsi seperti yang diharapkan** dan bisa memotong argumen secara tidak terduga. Selalu gunakan satu argumen gabungan tanpa spasi: `nxnode install pkg@^0.5.17` atau bungkus dengan tanda kutip: `nxnode install "pkg@^0.5.17"`.

Contoh A1:

```json
{
  "dependencies": {
    "express": "^5.1.0",
    "axios": "^1.11.0"
  }
}
```

A2:

```json
{
  "dependencies": {
    "express": "^5.1.0",
    "axios": "^1.11.0",
    "sharp": "^0.34.3"
  }
}
```

A3:

```json
{
  "dependencies": {
    "express": "^4.21.2"
  }
}
```

NxNode membaca kebutuhan masing-masing project.

---

# 8. Dukungan Versi Berbeda

NxNode tidak boleh memaksakan satu versi package untuk semua project.

Contoh:

```text
A1 → express@5.1.0
A2 → express@5.1.0
A3 → express@4.21.2
```

Store:

```text
D:\NxNodeStore
└── packages
    └── express
        ├── 4.21.2
        └── 5.1.0
```

A1 dan A2 menggunakan:

```text
express@5.1.0
```

A3 menggunakan:

```text
express@4.21.2
```

Dengan demikian dependency isolation tetap terjaga.

## 8.1 Multiple Versi dalam Satu Dependency Tree

Selain lintas project, versi berbeda dari package yang sama juga bisa muncul **dalam satu** instalasi, karena transitive dependency dari package berbeda kadang butuh versi berbeda. Contoh nyata: install `@codemirror/autocomplete` menghasilkan peringatan seperti ini karena beberapa sub-dependency membutuhkan versi `@codemirror/view` yang berbeda:

```text
[NxNode] Warning: Multiple versions of the same package are required:
  @codemirror/view: 6.0.0, 6.17.0
  style-mod: 4.0.0, 4.1.0
  @codemirror/state: 6.0.0, 6.1.4
[NxNode] Each version will be stored and linked independently (see README §8).
```

Ini bukan error — setiap versi disimpan dan di-link terpisah persis seperti skenario lintas project di atas (§8), berkat struktur nested `node_modules` di dalam store (§6.1). Package yang butuh versi tertentu akan mendapat versi itu tepat sesuai kebutuhannya, tidak saling menimpa.

---

# 9. Algoritma Install

Ketika user menjalankan:

```powershell
nxnode install express
```

NxNode melakukan:

```text
                nxnode install express
                           │
                           ↓
                    Baca package.json
                           │
                           ↓
                   Resolve version
                           │
                           ↓
             Cek Global Package Store
                    /              \
                  ADA             TIDAK ADA
                   │                  │
                   ↓                  ↓
                 Link              Download
                                      │
                                      ↓
                                Store package
                                      │
                                      ↓
                                    Link
```

---

# 10. Contoh Install Pertama

```powershell
cd D:\IDE\Project-A1

nxnode install express
```

Output:

```text
[NxNode] Resolving express...
[NxNode] Required version: 5.1.0

[NxNode] Global Store:
         express@5.1.0 not found

[NxNode] Downloading...
[NxNode] Storing package...
[NxNode] Linking package...

✓ express@5.1.0 installed
```

---

# 11. Install Project Kedua

```powershell
cd E:\Development\Project-A2

nxnode install express
```

Output:

```text
[NxNode] Resolving express...
[NxNode] Required version: 5.1.0

[NxNode] Global Store:
         express@5.1.0 found

[NxNode] Download skipped
[NxNode] Linking existing package...

✓ express@5.1.0 linked
```

Tidak perlu download ulang.

---

# 12. Dependency Baru

Jika A2 membutuhkan:

```powershell
nxnode install sharp
```

dan belum tersedia:

```text
[NxNode] sharp@0.34.3
[NxNode] Package not found in store

[NxNode] Downloading...
[NxNode] Storing...
[NxNode] Linking...

✓ sharp@0.34.3 installed
```

Setelah itu project lain dapat menggunakan package tersebut tanpa download ulang.

---

# 13. Command Line Interface

CLI awal:

```text
nxnode install <package>
nxnode install <package>@<version>
nxnode remove <package>
nxnode update <package>

nxnode list
nxnode list --global

nxnode store
nxnode store path
nxnode store clean

nxnode project create <name>

nxnode link
nxnode unlink

nxnode config
nxnode doctor
```

---

# 14. Konfigurasi Store

Lokasi default: folder `.store` di dalam instalasi NxNode itu sendiri, misalnya:

```text
D:\Framework\CLI\nxnode\.store
```

Ini dipilih agar semua data NxNode (source code + store) terkumpul di satu lokasi, bukan tersebar ke drive root secara implisit.

Tetapi user dapat mengubahnya:

```powershell
nxnode config store E:\NxPackages
```

Kemudian:

```text
E:\NxPackages
```

menjadi Global Package Store.

Konfigurasi dapat disimpan dalam:

```text
%USERPROFILE%\.nxnode\config.json
```

Contoh:

```json
{
  "storePath": "D:\\NxNodeStore"
}
```

---

# 15. Arsitektur NxNode

```text
┌───────────────────────────────┐
│          NxNode CLI            │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       Project Manager          │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      Dependency Resolver       │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       Package Registry         │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       Global Package Store     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│            Linker              │
└───────────────┬───────────────┘
                ↓
       Project node_modules
```

---

# 16. Package Registry

Untuk MVP, NxNode dapat menggunakan registry npm sebagai sumber package.

Alurnya:

```text
NxNode
   ↓
npm Registry
   ↓
Download package
   ↓
Verify
   ↓
Global Store
   ↓
Link
```

NxNode tidak perlu membuat registry sendiri pada tahap awal.

---

# 17. Content-Addressable Storage

Versi lanjutan dapat menggunakan penyimpanan berdasarkan hash.

Contoh:

```text
D:\NxNodeStore
└── objects
    ├── sha256-xxxx
    ├── sha256-yyyy
    └── sha256-zzzz
```

Package yang identik secara isi hanya disimpan satu kali.

Konsep:

```text
Package A
       \
        → Hash yang sama → 1 object
       /
Package B
```

Ini dapat mengurangi penggunaan disk lebih jauh.

---

# 18. Hardlink / Symlink

NxNode dapat memiliki beberapa strategi linker:

```text
linkMode:
    symlink
    junction
    hardlink
    copy
```

Pada Windows, implementasi awal dapat menggunakan:

```text
Directory Junction
```

atau symbolic link sesuai kebutuhan.

Jika linking tidak tersedia atau gagal:

```text
link
 ↓
fallback
 ↓
copy
```

## 18.1 Keterbatasan Link-Based node_modules

Karena `node_modules` project berisi junction/symlink ke Global Store (bukan salinan fisik asli), ada beberapa hal yang perlu diperhatikan:

- **Tool yang mengasumsikan salinan fisik nyata** (beberapa bundler, antivirus tertentu, atau proses backup/sync seperti OneDrive) dapat memperlakukan link secara berbeda dari folder biasa — misalnya tidak mem-follow isinya, atau justru menyalin isi link sebagai file baru.
- **Symlink butuh privilege khusus di Windows** (Developer Mode aktif, atau dijalankan sebagai Administrator), sedangkan **junction tidak butuh privilege apa pun**. Karena itu `junction` dipilih sebagai default di Windows, bukan `symlink`.
- **WSL / lintas filesystem** — junction/symlink yang dibuat dari Windows tidak selalu terbaca benar dari dalam WSL karena perbedaan cara kedua sistem menangani link.

**Mitigasi yang sudah diimplementasikan:**

- NxNode secara otomatis fallback ke `copy` jika linking gagal (lihat diagram di atas), sehingga install tetap berhasil walau linking tidak didukung.
- Setiap package yang di-link (atau di-copy sebagai fallback) dicatat di manifest lokal:
  ```text
  node_modules/.nxnode/links.json
  ```
  Manifest ini menyimpan `linkMode` aktual yang dipakai per-package (bisa berbeda dari `linkMode` di config jika terjadi fallback), lokasi sumber di store, dan waktu link dibuat. Jalankan `nxnode list` untuk melihat status link setiap dependency:
  ```text
  express@^5.1.0  [linked (junction) -> D:\NxNodeStore\packages\express\5.1.0\package]
  lodash@^4.17.0  [copied -> D:\NxNodeStore\packages\lodash\4.17.0\package]
  ```
- Jika mengalami masalah dengan tool tertentu yang tidak kompatibel dengan link, ubah ke mode `copy` untuk project tersebut:
  ```powershell
  nxnode config linkMode copy
  ```
  Konsekuensinya, dedup fisik tidak berlaku untuk project itu (kembali seperti `npm install` biasa), tapi kompatibilitas penuh terjaga.

---

# 19. Dependency Tree

NxNode harus tetap menangani dependency transitif.

Contoh:

```text
A1
└── express
    ├── accepts
    ├── body-parser
    ├── cookie
    └── ...
```

NxNode harus mengetahui:

```text
A1
 ↓
express
 ↓
dependency express
 ↓
dependency dependency
```

Package yang sama dapat digunakan bersama jika versi dan integrity-nya kompatibel.

---

# 20. Integrity

Setiap package yang masuk ke Global Store harus diverifikasi.

Contoh metadata:

```json
{
  "name": "express",
  "version": "5.1.0",
  "integrity": "sha512-...",
  "source": "npm",
  "installedAt": "2026-09-11T..."
}
```

Tujuannya:

```text
Download
   ↓
Verify integrity
   ↓
Store
```

Bukan:

```text
Download
   ↓
langsung percaya
```

---

# 21. Project Independence

Walaupun package fisiknya dibagi, setiap project tetap independen.

```text
Project A1
├── package.json
├── nxnode.lock
└── node_modules

Project A2
├── package.json
├── nxnode.lock
└── node_modules
```

A1 dapat dihapus tanpa merusak A2.

Jika A1 dihapus:

```text
A1
 ↓
unlink
 ↓
package reference hilang
```

Package global tetap ada selama masih digunakan project lain.

---

# 22. Garbage Collection

NxNode dapat menyediakan:

```powershell
nxnode store clean
```

Proses:

```text
Global Store
     ↓
Cari package yang direferensikan project
     ↓
Package digunakan?
   /       \
 YA        TIDAK
 │           │
keep       remove
```

Contoh:

```text
express@5.1.0 → digunakan A1,A2 → KEEP
axios@1.11.0   → digunakan A1,A2 → KEEP
sharp@0.34.3   → tidak digunakan → REMOVE
```

NxNode tidak menebak project mana yang aktif dengan men-scan filesystem dari direktori saat ini. Setiap kali `nxnode install` atau `nxnode project create` dijalankan, lokasi project dicatat ke index:

```text
<storePath>\indexes\projects.json
```

`nxnode store clean` membaca **`nxnode.lock`** tiap project terdaftar (bukan `package.json`) untuk menentukan package mana yang masih dipakai — ini penting karena `package.json` hanya mencantumkan direct dependency, sedangkan `nxnode.lock` mencakup seluruh transitive dependency juga (lihat §23). Jika belum ada project yang tercatat, `store clean` menolak menghapus apa pun agar tidak salah membuang package yang sebenarnya masih digunakan.

---

# 23. Lockfile

NxNode sebaiknya mempunyai lockfile:

```text
nxnode.lock
```

Contoh konsep:

```yaml
express:
  version: 5.1.0
  integrity: sha512-...

axios:
  version: 1.11.0
  integrity: sha512-...
```

`nxnode.lock` bersifat **kumulatif** — setiap kali `nxnode install <package>` dijalankan, entry package baru (beserta seluruh transitive dependency-nya) di-*merge* ke dalam lockfile yang sudah ada, bukan menimpanya. Ini penting karena `nxnode store clean` (§22) membaca lockfile untuk menentukan package mana yang masih dipakai project — kalau lockfile ditimpa alih-alih di-merge, package dari install sebelumnya akan salah dianggap "tidak dipakai" dan berisiko dihapus.

Tujuannya agar instalasi dapat direproduksi.

---

# 24. Struktur Source Code

Implementasi awal dapat dibuat:

```text
nxnode/
│
├── package.json
├── README.md
│
├── bin/
│   └── nxnode.js
│
├── src/
│   ├── cli/
│   │   ├── install.js
│   │   ├── remove.js
│   │   ├── update.js
│   │   └── store.js
│   │
│   ├── resolver/
│   │   ├── resolver.js
│   │   └── dependency-tree.js
│   │
│   ├── registry/
│   │   └── npm.js
│   │
│   ├── store/
│   │   ├── store.js
│   │   ├── metadata.js
│   │   └── integrity.js
│   │
│   ├── linker/
│   │   ├── symlink.js
│   │   ├── junction.js
│   │   └── copy.js
│   │
│   ├── project/
│   │   ├── project.js
│   │   └── package-json.js
│   │
│   └── config/
│       └── config.js
│
└── tests/
```

---

# 25. Tahapan Pengembangan

## Phase 1 — MVP

Fokus:

```text
CLI
Global Store
npm Registry
package.json
Install
Link
Remove
Config
```

Target:

```powershell
nxnode install express
```

berfungsi.

---

## Phase 2 — Dependency Resolver

Tambahkan:

```text
Semver
Dependency Tree
Transitive Dependencies
Lockfile
Integrity
```

---

## Phase 3 — Smart Store

Tambahkan:

```text
Content Hash
Deduplication
Cache
Garbage Collection
Store Statistics
```

---

## Phase 4 — Advanced Linking

Tambahkan:

```text
Symlink
Junction
Hardlink
Fallback Copy
Windows optimization
Linux support
```

---

## Phase 5 — NxNode Ecosystem

Kemudian dapat dikembangkan menjadi:

```text
NxNode
├── Package Manager
├── Project Manager
├── Global Store
├── Workspace Manager
├── Dependency Analyzer
├── Cache
└── Build Integration
```

---

# 26. Prinsip Utama

NxNode harus mengikuti prinsip:

```text
PROJECT ≠ PACKAGE STORAGE
```

Project menentukan:

```text
"Apa yang saya butuhkan?"
```

Global Store menentukan:

```text
"Package fisiknya disimpan di mana?"
```

Resolver menentukan:

```text
"Versi mana yang dibutuhkan?"
```

Linker menentukan:

```text
"Bagaimana project mengakses package tersebut?"
```

---

# 27. Target Akhir

Dengan NxNode:

```text
                 ┌────────────────────┐
                 │  NxNode Store      │
                 │                    │
                 │ express@5          │
                 │ axios@1            │
                 │ ws@8               │
                 │ sharp@0            │
                 │ react@19           │
                 └─────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
       Project A1       Project A2       Project A3
       lokasi bebas     lokasi bebas     lokasi bebas
```

Tidak masalah apakah project berada di:

```text
C:\
D:\
E:\
F:\
```

atau folder mana pun.

Semua project dapat menggunakan **satu package store bersama**, sementara dependency dan lockfile tetap terisolasi pada masing-masing project.

---

# 28. Kesimpulan

NxNode bukan sekadar:

```text
npm install global
```

melainkan sistem:

```text
Shared Package Store
        +
Dependency Resolver
        +
Project Isolation
        +
Package Linking
        +
Deduplication
```

Konsep ini memungkinkan banyak project Node.js menggunakan dependency yang sama tanpa harus menyimpan salinan fisik package yang sama berulang kali.

**Target MVP:**

```text
nxnode install <package>
        ↓
cek Global Store
        ↓
jika ada → link
        ↓
jika tidak ada → download → store → link
```

Dengan desain ini, project dapat berada **di lokasi mana pun**, sementara NxNode mengelola package secara terpusat.

---

# 29. Quick Start

## Install

```bash
npm install -g nxnode
```

## Basic Usage

```bash
# Create new project
nxnode project create my-app
cd my-app

# Add dependency to package.json
npm pkg set dependencies.express="^5.1.0"

# Install package
nxnode install express

# List local dependencies
nxnode list

# List global store
nxnode list --global

# Update package
nxnode update express

# Remove package
nxnode remove express
```

## Configuration

```bash
# View config
nxnode config

# Change store location
nxnode config storePath E:\MyStore

# Change link mode (junction/symlink/hardlink/copy)
nxnode config linkMode junction

# Check system status
nxnode doctor
```

## Store Management

```bash
# View store info
nxnode store

# View store path
nxnode store path

# Clean unused packages
nxnode store clean
```

## Link/Unlink

```bash
# Link all dependencies from store
nxnode link

# Unlink all dependencies
nxnode unlink
```

---

# 30. Link Modes

NxNode supports multiple linking strategies:

| Mode | Description | Platform |
|------|-------------|----------|
| `junction` | Directory junction (default on Windows) | Windows |
| `symlink` | Symbolic link | All |
| `hardlink` | Hard links for files | All |
| `copy` | Copy files (fallback) | All |

Set link mode:
```bash
nxnode config linkMode symlink
```

---

# 31. Global Store Location

Default: folder `.store` di dalam instalasi NxNode (misalnya `D:\Framework\CLI\nxnode\.store`)

Config file: `%USERPROFILE%\.nxnode\config.json`

```json
{
  "storePath": "D:\\Framework\\CLI\\nxnode\\.store",
  "linkMode": "junction"
}
```

---

# 32. Lisensi

Dirilis di bawah **MIT License** — lihat berkas [`LICENSE`](./LICENSE).

Ingin berkontribusi? Lihat [`CONTRIBUTING.md`](./CONTRIBUTING.md).
