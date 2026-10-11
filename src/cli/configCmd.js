const config = require('../config/config');

function showConfig() {
  const cfg = config.load();
  console.log('[NxNode] Configuration:');
  console.log(`  Store Path: ${cfg.storePath}`);
  console.log(`  Link Mode: ${cfg.linkMode}`);
}

function setConfig(key, value) {
  const allowedKeys = ['storePath', 'linkMode'];
  if (!allowedKeys.includes(key)) {
    throw new Error(`Unknown config key: ${key}. Allowed keys: ${allowedKeys.join(', ')}`);
  }

  config.set(key, value);
  console.log(`[NxNode] ${key} set to ${value}`);
}

module.exports = { showConfig, setConfig };
