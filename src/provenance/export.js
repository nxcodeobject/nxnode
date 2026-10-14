/**
 * Builder dokumen SBOM standar dari hasil provenance.
 * - SPDX 2.3 (JSON)
 * - CycloneDX 1.5 (JSON)
 *
 * Fungsi-fungsi di sini murni (tanpa network/file) supaya mudah diuji.
 */

function spdxIdFor(name, version) {
  return `SPDXRef-Package-${name.replace(/[^A-Za-z0-9.-]/g, '-')}-${version}`;
}

function purlFor(name, version) {
  const encoded = name.startsWith('@')
    ? `%40${name.slice(1)}`
    : encodeURIComponent(name);
  return `pkg:npm/${encoded}@${version}`;
}

function buildSpdx(entries, options = {}) {
  const now = options.now || new Date().toISOString();
  const namespace = options.namespace || `https://nxnode.dev/spdx/${Date.now()}`;

  const packages = entries.map((entry) => {
    const externalRefs = [];
    if (entry.origin?.tarball) {
      externalRefs.push({
        referenceCategory: 'PACKAGE-MANAGER',
        referenceType: 'purl',
        referenceLocator: purlFor(entry.name, entry.version)
      });
    }

    return {
      SPDXID: spdxIdFor(entry.name, entry.version),
      name: entry.name,
      versionInfo: entry.version,
      downloadLocation: entry.origin?.tarball || 'NOASSERTION',
      licenseConcluded: entry.license?.declared || 'NOASSERTION',
      licenseDeclared: entry.license?.declared || 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      externalRefs
    };
  });

  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: options.name || 'nxnode-store',
    documentNamespace: namespace,
    creationInfo: {
      created: now,
      creators: ['Tool: nxnode'],
      licenseListVersion: '3.22'
    },
    packages
  };
}

function buildCycloneDx(entries, options = {}) {
  const now = options.now || new Date().toISOString();

  const components = entries.map((entry) => {
    const component = {
      type: 'library',
      name: entry.name,
      version: entry.version,
      purl: purlFor(entry.name, entry.version),
      licenses: entry.license?.declared
        ? [{ license: { id: entry.license.declared } }]
        : []
    };

    if (entry.origin?.integrity) {
      component.hashes = [
        {
          alg: 'SHA-512',
          content: entry.origin.integrity.replace(/^sha512-/, '')
        }
      ];
    }

    if (entry.vulnerabilities && entry.vulnerabilities.length > 0) {
      component.vulnerabilities = entry.vulnerabilities.map((v) => ({ id: v.id }));
    }

    return component;
  });

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: now,
      tools: [{ vendor: 'nxnode', name: 'nxnode', version: options.toolVersion || require('../../package.json').version }],
      component: {
        type: 'application',
        name: options.name || 'nxnode-store',
        version: options.projectVersion || '0.0.0'
      }
    },
    components
  };
}

function build(format, entries, options = {}) {
  switch (format) {
    case 'spdx':
      return buildSpdx(entries, options);
    case 'cyclonedx':
      return buildCycloneDx(entries, options);
    default:
      throw new Error(`Unknown export format: ${format}. Use "spdx" or "cyclonedx".`);
  }
}

module.exports = { build, buildSpdx, buildCycloneDx, purlFor, spdxIdFor };
