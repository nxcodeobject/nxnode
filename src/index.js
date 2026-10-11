const { install, installAll, downloadAndStore, parsePackageArg } = require('./cli/install');
const { remove } = require('./cli/remove');
const { update } = require('./cli/update');
const { link, unlink } = require('./cli/link');
const store = require('./store/store');
const registry = require('./store/registry');
const lockfile = require('./store/lockfile');
const project = require('./project/project');
const config = require('./config/config');
const resolver = require('./resolver/resolver');
const linker = require('./linker/linker');

module.exports = {
  install,
  installAll,
  downloadAndStore,
  parsePackageArg,
  remove,
  update,
  link,
  unlink,
  store,
  registry,
  lockfile,
  project,
  config,
  resolver,
  linker
};
