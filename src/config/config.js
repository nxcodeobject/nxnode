const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.nxnode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PACKAGE_ROOT = path.join(__dirname, '..', '..');

const DEFAULT_CONFIG = {
  storePath: path.join(PACKAGE_ROOT, '.store'),
  linkMode: 'junction'
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function load() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function save(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function get(key) {
  const config = load();
  return key ? config[key] : config;
}

function set(key, value) {
  const config = load();
  config[key] = value;
  save(config);
  return config;
}

module.exports = { load, save, get, set, DEFAULT_CONFIG, CONFIG_DIR, CONFIG_FILE };
