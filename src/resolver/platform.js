/**
 * Cek apakah sebuah package kompatibel dengan platform/arch Node saat ini,
 * berdasarkan field `os`/`cpu` di package.json (format npm standar:
 * array positif seperti ["darwin"], atau negatif seperti ["!win32"]).
 * Package tanpa field ini dianggap kompatibel dengan semua platform.
 */
function matchesList(list, current) {
  if (!Array.isArray(list) || list.length === 0) return true;

  const negations = list.filter((v) => v.startsWith('!'));
  const positives = list.filter((v) => !v.startsWith('!'));

  if (negations.some((v) => v.slice(1) === current)) return false;
  if (positives.length > 0) return positives.includes(current);
  return true;
}

function isPlatformCompatible(metadata) {
  const osOk = matchesList(metadata?.os, process.platform);
  const cpuOk = matchesList(metadata?.cpu, process.arch);
  return osOk && cpuOk;
}

module.exports = { isPlatformCompatible };
