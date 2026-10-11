const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall'];

function getLifecycleMarkerPath(packageDir) {
  return path.join(packageDir, '.nxnode-lifecycle-done');
}

function hasRunLifecycle(packageDir) {
  return fs.existsSync(getLifecycleMarkerPath(packageDir));
}

function markLifecycleDone(packageDir, result) {
  fs.writeFileSync(getLifecycleMarkerPath(packageDir), JSON.stringify(result, null, 2), 'utf-8');
}

function hasLifecycleScripts(scripts) {
  return LIFECYCLE_SCRIPTS.some((name) => scripts?.[name]);
}

/**
 * Jalankan preinstall/install/postinstall dari sebuah package, di dalam
 * folder package itu sendiri di store (bukan di project) — hasilnya
 * (misal binary yang didownload) otomatis dishare lintas semua project
 * yang memakai versi package yang sama.
 *
 * Berjalan sekali per package version (ditandai file marker); pemanggilan
 * berikutnya untuk package/version yang sama akan di-skip.
 *
 * TIDAK dijalankan otomatis oleh install() biasa — harus diminta eksplisit
 * lewat opsi { runLifecycleScripts: true } karena ini menjalankan kode
 * arbitrary dari registry npm (sama seperti npm install, tapi nxnode
 * defaultnya lebih terisolasi).
 */
function runLifecycleScripts(packageDir, packageName, version, scripts, onProgress) {
  if (hasRunLifecycle(packageDir)) {
    return { skipped: true, reason: 'already-run' };
  }

  if (!hasLifecycleScripts(scripts)) {
    markLifecycleDone(packageDir, { ran: [], skipped: true, reason: 'no-scripts' });
    return { skipped: true, reason: 'no-scripts' };
  }

  const ran = [];
  const errors = [];

  for (const scriptName of LIFECYCLE_SCRIPTS) {
    const command = scripts[scriptName];
    if (!command) continue;

    onProgress?.({
      type: 'lifecycle-script',
      packageName,
      version,
      script: scriptName,
      line: `[NxNode] Running ${scriptName} for ${packageName}@${version}...`
    });

    const binDir = path.join(packageDir, 'node_modules', '.bin');
    const env = { ...process.env };
    // process.env is case-insensitive on Windows, but a plain object spread
    // is not — remove every PATH-like key first so only one survives with
    // the augmented value (a stray original-case "Path" would otherwise
    // shadow it and cmd.exe would never see the added .bin directory).
    const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
    const existingPath = env[pathKey] || '';
    for (const k of Object.keys(env)) {
      if (k.toLowerCase() === 'path') delete env[k];
    }
    env[pathKey] = `${binDir}${path.delimiter}${existingPath}`;

    const result = spawnSync(command, {
      cwd: packageDir,
      shell: true,
      stdio: 'pipe',
      env,
      timeout: 5 * 60 * 1000
    });

    if (result.error || result.status !== 0) {
      const message = result.error?.message || `exit code ${result.status}`;
      errors.push({ script: scriptName, message, stderr: result.stderr?.toString().slice(-2000) });
      onProgress?.({
        type: 'lifecycle-script-failed',
        packageName,
        version,
        script: scriptName,
        line: `[NxNode] Warning: ${scriptName} failed for ${packageName}@${version}: ${message}`
      });
      break;
    }

    ran.push(scriptName);
  }

  const outcome = { ran, errors, skipped: false };
  markLifecycleDone(packageDir, outcome);
  return outcome;
}

module.exports = { runLifecycleScripts, hasRunLifecycle, hasLifecycleScripts, getLifecycleMarkerPath };
