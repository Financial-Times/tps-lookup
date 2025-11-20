const { spawnSync } = require('child_process');

function getDeletions(oldFile, newFile) {
  const deletionCheck = spawnSync(
    '/bin/bash',
    [
      '-c',
      `
        LC_ALL=C comm -23 <(tr -d '\r' < "${oldFile}" | sort -u) <(tr -d '\r' < "${newFile}" | sort -u)
      `
    ],
    {
      cwd: '/tmp',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  if (deletionCheck.error || deletionCheck.status !== 0) {
    throw new Error(
      `comm failed: ${deletionCheck.stderr || deletionCheck.error}`
    );
  }

  return deletionCheck.stdout.split('\n').filter(Boolean);
}

function getAdditions(oldFile, newFile) {
  const additionCheck = spawnSync(
    '/bin/bash',
    [
      '-c',
      `
      LC_ALL=C comm -13 <(tr -d '\r' < "${oldFile}" | sort -u) <(tr -d '\r' < "${newFile}" | sort -u)
      `
    ],
    {
      cwd: '/tmp',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  if (additionCheck.error || additionCheck.status !== 0) {
    throw new Error(
      `comm failed: ${additionCheck.stderr || additionCheck.error}`
    );
  }

  return additionCheck.stdout.split('\n').filter(Boolean);
}

module.exports = {
  getDeletions,
  getAdditions
};
