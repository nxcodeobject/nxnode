const fs = require('fs');
const path = require('path');
const store = require('./store');

function getRegistryPath() {
  return path.join(store.getStorePath(), 'indexes', 'projects.json');
}

function readRegistry() {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeRegistry(projects) {
  store.ensureStore();
  fs.writeFileSync(getRegistryPath(), JSON.stringify(projects, null, 2), 'utf-8');
}

function registerProject(projectDir) {
  const resolved = path.resolve(projectDir);
  const projects = readRegistry();
  if (!projects.includes(resolved)) {
    projects.push(resolved);
    writeRegistry(projects);
  }
}

function unregisterProject(projectDir) {
  const resolved = path.resolve(projectDir);
  const projects = readRegistry().filter(p => p !== resolved);
  writeRegistry(projects);
}

function listProjects() {
  return readRegistry().filter(p => fs.existsSync(p));
}

module.exports = { registerProject, unregisterProject, listProjects, getRegistryPath };
