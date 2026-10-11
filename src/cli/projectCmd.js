const path = require('path');
const project = require('../project/project');
const registry = require('../store/registry');

function createProject(projectName) {
  const targetDir = path.resolve(process.cwd(), projectName);

  if (project.readPackageJson(targetDir)) {
    throw new Error(`${targetDir} already has a package.json`);
  }

  console.log(`[NxNode] Creating project: ${projectName}`);
  project.createProject(targetDir, projectName);
  registry.registerProject(targetDir);
  console.log(`\u2713 Project created at ${targetDir}`);
}

module.exports = { createProject };
