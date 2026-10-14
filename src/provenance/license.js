const fs = require('fs');
const path = require('path');

// Alias nama license yang umum muncul di package.json ke identifier SPDX.
// Kunci sudah dinormalisasi lowercase tanpa spasi/tanda baca.
const LICENSE_ALIASES = {
  mit: 'MIT',
  'mit license': 'MIT',
  'the mit license': 'MIT',
  'the mit license (mit)': 'MIT',
  'mit/x11': 'MIT',
  isc: 'ISC',
  'isc license': 'ISC',
  'apache-2.0': 'Apache-2.0',
  'apache 2.0': 'Apache-2.0',
  'apache license 2.0': 'Apache-2.0',
  'apache-2': 'Apache-2.0',
  'apache2': 'Apache-2.0',
  'the apache software license, version 2.0': 'Apache-2.0',
  'apache license, version 2.0': 'Apache-2.0',
  bsd: 'BSD-3-Clause',
  'bsd-2-clause': 'BSD-2-Clause',
  'simplified bsd': 'BSD-2-Clause',
  'bsd-3-clause': 'BSD-3-Clause',
  'new bsd': 'BSD-3-Clause',
  'bsd 3-clause': 'BSD-3-Clause',
  '3-clause bsd': 'BSD-3-Clause',
  'bsd license': 'BSD-3-Clause',
  '2-clause bsd': 'BSD-2-Clause',
  'gpl-3.0': 'GPL-3.0-only',
  'gpl-3.0-only': 'GPL-3.0-only',
  'gplv3': 'GPL-3.0-only',
  'gpl-3.0-or-later': 'GPL-3.0-or-later',
  'gpl-2.0': 'GPL-2.0-only',
  'gpl-2.0-only': 'GPL-2.0-only',
  gplv2: 'GPL-2.0-only',
  'lgpl-3.0': 'LGPL-3.0-only',
  'lgpl-2.1': 'LGPL-2.1-only',
  'mpl-2.0': 'MPL-2.0',
  'mozilla public license 2.0': 'MPL-2.0',
  unlicense: 'Unlicense',
  'the unlicense': 'Unlicense',
  cc0: 'CC0-1.0',
  'cc0-1.0': 'CC0-1.0',
  'public domain': 'Unlicense',
  wtfpl: 'WTFPL',
  'zlib': 'Zlib',
  'artistic-2.0': 'Artistic-2.0',
  '0bsd': '0BSD'
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalisasi satu string license ke identifier SPDX.
 * Mengembalikan null bila tidak dikenali (tidak menebak).
 */
function normalizeLicense(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Ekspresi SPDX majemuk, mis. "MIT OR Apache-2.0" — normalkan tiap bagian.
  if (/\s(AND|OR)\s/i.test(trimmed)) {
    const parts = trimmed.split(/\s+(AND|OR)\s+/i);
    const normalizedParts = parts.map((part, index) => {
      if (index % 2 === 1) return part.toUpperCase();
      return normalizeLicense(part) || part.trim();
    });
    return normalizedParts.join(' ');
  }

  const withKey = trimmed.replace(/\s*\(.*?\)\s*$/, '');
  const key = normalizeKey(withKey);
  if (LICENSE_ALIASES[key]) return LICENSE_ALIASES[key];

  const directKey = normalizeKey(trimmed);
  if (LICENSE_ALIASES[directKey]) return LICENSE_ALIASES[directKey];

  // Terima hanya bila jelas identifier SPDX: mengandung versi/angka atau tanda
  // hubung gaya SPDX (mis. "MIT" ada di alias, "Apache-2.0", "GPL-3.0-or-later",
  // "BSD-3-Clause", "CC-BY-4.0"). Kata CamelCase tanpa itu (mis.
  // "SomeCustomLicense") BUKAN identifier SPDX dan harus dikembalikan null.
  if (/^[A-Za-z][A-Za-z0-9.+-]*-[0-9]/.test(trimmed) || /^[A-Za-z]+-[A-Za-z0-9.-]+$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d?[A-Za-z]+-\d+(\.\d+)*([-+][A-Za-z0-9.-]+)*$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Ambil license "declared" dari metadata package.json npm (field `license`
 * lalu fallback ke `licenses`).
 */
function getDeclaredLicense(packageJson) {
  if (!packageJson) return null;

  if (typeof packageJson.license === 'string') {
    return normalizeLicense(packageJson.license);
  }

  if (packageJson.license && typeof packageJson.license === 'object') {
    return normalizeLicense(packageJson.license.type);
  }

  if (Array.isArray(packageJson.licenses)) {
    const parts = packageJson.licenses
      .map(entry => (typeof entry === 'string' ? entry : entry && entry.type))
      .map(normalizeLicense)
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' OR ');
  }

  return null;
}

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING'];

function detectLicenseFromText(text) {
  if (!text) return null;
  const head = text.slice(0, 4000);

  if (/MIT License|Permission is hereby granted, free of charge/i.test(head)) return 'MIT';
  if (/Apache License,?\s*Version 2\.0|Licensed under the Apache License, Version 2\.0/i.test(head)) return 'Apache-2.0';
  if (/ISC License|Permission to use, copy, modify, and\/or distribute this software/i.test(head)) return 'ISC';
  if (/BSD 2-Clause|Redistribution and use in source and binary forms, with or without modification[\s\S]*?this list of conditions and the following disclaimer/i.test(head)) {
    if (/3-Clause|Neither the name/i.test(head)) return 'BSD-3-Clause';
    return 'BSD-2-Clause';
  }
  if (/GNU GENERAL PUBLIC LICENSE[\s\S]*?Version 3/i.test(head)) return 'GPL-3.0-only';
  if (/GNU GENERAL PUBLIC LICENSE[\s\S]*?Version 2/i.test(head)) return 'GPL-2.0-only';
  if (/GNU LESSER GENERAL PUBLIC LICENSE[\s\S]*?Version 3/i.test(head)) return 'LGPL-3.0-only';
  if (/Mozilla Public License Version 2\.0/i.test(head)) return 'MPL-2.0';
  if (/This is free and unencumbered software released into the public domain/i.test(head)) return 'Unlicense';

  return null;
}

/**
 * Deteksi license dari file LICENSE di dalam folder package.
 * Mengembalikan null bila tidak ada / tidak dikenali.
 */
function detectLicenseFromFiles(packageDir) {
  for (const fileName of LICENSE_FILE_NAMES) {
    const filePath = path.join(packageDir, fileName);
    try {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf-8');
        const detected = detectLicenseFromText(text);
        if (detected) return detected;
      }
    } catch {
      // lewati file yang tidak terbaca
    }
  }
  return null;
}

/**
 * Deteksi lengkap: declared (dari package.json) dan detected (dari file LICENSE).
 * `declared` dan `detected` dilaporkan terpisah; `mismatch` true bila keduanya ada
 * tapi berbeda — sinyal untuk compliance.
 */
function detectLicense(packageDir, packageJson) {
  const declared = getDeclaredLicense(packageJson);
  const detected = detectLicenseFromFiles(packageDir);

  return {
    declared: declared || null,
    detected: detected || null,
    mismatch: Boolean(declared && detected && declared !== detected)
  };
}

module.exports = {
  normalizeLicense,
  getDeclaredLicense,
  detectLicenseFromFiles,
  detectLicenseFromText,
  detectLicense,
  LICENSE_ALIASES
};
