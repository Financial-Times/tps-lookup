const fs = require("fs");
const { spawnSync } = require("child_process");
const checkAwsAccess = require("../src/aws/check-aws-access.js");
const logger = require("../helper/logger.js");

const updateNumbers = async () => {
  logger.info({ event: "UPDATE_NUMBERS", type: "START", message: "Starting updateNumbers script" });

  const hasAwsAccess = await checkAwsAccess();

  if (!hasAwsAccess) {
    logger.error({ event: 'No AWS access - exiting' });
    process.exit(1);
  }
  // Get file from S3, then from FTP
  const s3ParamsTPS = { Bucket: "email-platform-ftcom-tps", Key: "tps.txt" };
  const s3ParamsCTPS = { Bucket: "email-platform-ftcom-tps", Key: "ctps.txt" };
  const oldCTPSFile = fs.createWriteStream("/tmp/ctps_original.txt");
  const oldTPSFile = fs.createWriteStream("/tmp/tps_original.txt");

  oldCTPSFile.on("close", () => {
  logger.info({ event: "Old CTPS file downloaded" });
  ftpToFS("./CTPS/ctps_ns.txt", "/tmp/ctps_new.txt", "ctps.txt");
  });

  oldTPSFile.on("close", () => {
    logger.info({ event: "Old TPS file downloaded" });
    ftpToFS("./tps/tps_ns.txt", "/tmp/tps_new.txt", "tps.txt");
  });

    logger.info({ event: "Downloading old files from s3", type: "START" });

  s3.getObject(s3ParamsTPS)
  .createReadStream()
  .on("error", (err) => {
    logger.error({
      event: "Failed to download old TPS files from s3",
      type: "FAILED",
      error: err,
    });
  })
  .pipe(oldTPSFile);

  logger.info({ event: "Downloading old files from s3", type: "START" });

  s3.getObject(s3ParamsCTPS)
    .createReadStream()
    .on("error", (err) => {
      logger.error({
        event: "Failed to download old CTPS files from s3",
        type: "FAILED",
        error: err,
      });
    })
    .pipe(oldCTPSFile);
};

export function getDeletions(oldFile, newFile) {
  const deletionCheck = spawnSync(
    "/bin/bash",
    [
      "-c",
      `
        LC_ALL=C comm -23 <(tr -d '\r' < "${oldFile}" | sort -u) <(tr -d '\r' < "${newFile}" | sort -u)
      `,
    ],
    {
      cwd: "/tmp",
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  if (deletionCheck.error || deletionCheck.status !== 0) {
    throw new Error(`comm failed: ${deletionCheck.stderr || deletionCheck.error}`);
  }

  return deletionCheck.stdout.split("\n").filter(Boolean);
}

export function getAdditions(oldFile, newFile) {
  const additionCheck = spawnSync(
    "/bin/bash",
    [
      "-c",
      `
      LC_ALL=C comm -13 <(tr -d '\r' < "${oldFile}" | sort -u) <(tr -d '\r' < "${newFile}" | sort -u)
      `,
    ],
    {
      cwd: "/tmp",
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  if (additionCheck.error || additionCheck.status !== 0) {
    throw new Error(`comm failed: ${additionCheck.stderr || additionCheck.error}`);
  }
  
  return additionCheck.stdout.split("\n").filter(Boolean);
}

updateNumbers()


