#!/usr/bin/env node

const { install, installAll } = require('./install');
const { remove } = require('./remove');
const { update } = require('./update');
const { listLocal, listGlobal } = require('./list');
const { showPath, showStoreInfo, showProjects, dedupStore } = require('./store');
const { showConfig, setConfig } = require('./configCmd');
const { createProject } = require('./projectCmd');
const { link, unlink } = require('./link');
const { clean } = require('./clean');
const { showProvenance } = require('./provenance');
const config = require('../config/config');
const pkg = require('../../package.json');

const args = process.argv.slice(2);
const command = args[0];
const arg1 = args[1];
const arg2 = args[2];

async function main() {
  try {
    switch (command) {
      case 'install':
      case 'i':
        if (!arg1) {
          await installAll();
        } else {
          await install(arg1, arg2);
        }
        break;

      case 'remove':
      case 'rm':
        if (!arg1) {
          console.error('[NxNode] Usage: nxnode remove <package>');
          process.exit(1);
        }
        await remove(arg1, arg2);
        break;

      case 'update':
      case 'u':
        if (!arg1) {
          console.error('[NxNode] Usage: nxnode update <package>');
          process.exit(1);
        }
        await update(arg1, arg2);
        break;

      case 'link':
        await link(arg1);
        break;

      case 'unlink':
        unlink(arg1);
        break;

      case 'list':
      case 'ls':
        if (arg1 === '--global' || arg1 === '-g') {
          listGlobal();
        } else {
          listLocal();
        }
        break;

      case 'store':
        if (arg1 === 'path') {
          showPath();
        } else if (arg1 === 'clean') {
          clean();
        } else if (arg1 === 'projects') {
          showProjects();
        } else if (arg1 === 'dedup') {
          dedupStore();
        } else {
          showStoreInfo();
        }
        break;

      case 'config':
        if (arg1 && arg2) {
          setConfig(arg1, arg2);
        } else {
          showConfig();
        }
        break;

      case 'project':
        if (arg1 === 'create') {
          if (!arg2) {
            console.error('[NxNode] Usage: nxnode project create <name>');
            process.exit(1);
          }
          createProject(arg2);
        } else {
          console.error('[NxNode] Usage: nxnode project create <name>');
        }
        break;

      case 'provenance':
        await showProvenance(args.slice(1));
        break;

      case 'doctor':
        console.log('[NxNode] Doctor:');
        console.log(`  Store: ${config.get('storePath')}`);
        console.log(`  Link Mode: ${config.get('linkMode')}`);
        console.log('  Status: OK');
        break;

      case '--version':
      case '-v':
        console.log(pkg.version);
        break;

      case '--help':
      case '-h':
      case undefined:
        console.log(`
NxNode - Shared Node.js Package Store

Usage: nxnode <command> [options]

Commands:
  install                Install all dependencies from package.json
  install <package>      Install a package with dependencies
  remove <package>      Remove a package from project
  update <package>      Update a package to latest version
  link                  Link all dependencies from store
  unlink                Unlink all dependencies
  list                  List local dependencies
  list --global         List global store packages
  store                 Show store info
  store path            Show store path
  store clean           Clean unused packages
  store projects        List registered projects using this store
  store dedup           Hardlink identical files across stored packages
  provenance [<pkg>]    Show package origin/integrity/license/quality provenance
                        --osv: include vulnerability data; --quality: detail quality signals
                        --export spdx|cyclonedx [--out <file>]
                        --dataset <dir>: write open per-package JSON dataset
  config                Show configuration
  config <key> <value>  Set configuration
  project create <name> Create a new project
  doctor                Check system status

Options:
  --version, -v         Show version
  --help, -h            Show help
        `);
        break;

      default:
        console.error(`[NxNode] Unknown command: ${command}`);
        console.log('[NxNode] Run "nxnode --help" for usage');
        process.exit(1);
    }
  } catch (err) {
    console.error(`[NxNode] Error: ${err.message}`);
    process.exit(1);
  }
}

main();
