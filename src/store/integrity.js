const crypto = require('crypto');
const fs = require('fs');

function computeHash(data, algorithm = 'sha512') {
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

function computeFileHash(filePath, algorithm = 'sha512') {
  const data = fs.readFileSync(filePath);
  return computeHash(data, algorithm);
}

function computeIntegrity(data) {
  const hash = crypto.createHash('sha512');
  hash.update(data);
  return `sha512-${hash.digest('base64')}`;
}

function verifyIntegrity(data, integrity) {
  const computed = computeIntegrity(data);
  return computed === integrity;
}

function verifyFileIntegrity(filePath, integrity) {
  const data = fs.readFileSync(filePath);
  return verifyIntegrity(data, integrity);
}

module.exports = { computeHash, computeFileHash, computeIntegrity, verifyIntegrity, verifyFileIntegrity };
