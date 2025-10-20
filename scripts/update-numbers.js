const logger = require("../helper/logger.js");
const checkAwsAccess = require("../src/aws/check-aws-access.js");
const ftpToFS = require("../src/ftp-to-fs.js");
const fs = require("fs");
const AWS = require("aws-sdk");

const { AWS_REGION } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });


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
updateNumbers()


