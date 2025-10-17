const logger = require("../helper/logger.js");
const checkAwsAccess = require("../src/aws/check-aws-access.js");
const fs = require("fs");
const co = require("co");
const wait = require("co-wait");
const { spawnSync } = require("child_process");
const { Client } = require("ssh2");
const AWS = require("aws-sdk");
const config = require("../config.js");

let done = 0;
const { AWS_REGION } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient();
const dynamoDB = new AWS.DynamoDB();

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

function uploadToS3(fileStream, key) {
  const params = {
    Bucket: "email-platform-ftcom-tps",
    Key: key,
    Body: fileStream,
  };
  return s3.upload(params).promise();
}

function addToDynamo(phone) {
  const params = {
    TableName: config.tableName,
    Item: {
      phone: phone.trim(),
    },
  };
  return docClient.put(params).promise();
}

function removeFromDynamo(phone) {
  const params = {
    TableName: config.tableName,
    Key: {
      phone: phone.trim(),
    },
  };
  return docClient.delete(params).promise();
}

function getDeletions(oldFile, newFile) {
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



function getAdditions(oldFile, newFile) {
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


function ftpToFS(moveFrom, moveTo, filename) {
  const conn = new Client();

  const connSettings = {
    host: config.sftpHost,
    port: config.sftpPort,
    username: config.sftpUsername,
    password: config.sftpPassword,
  };

  const newFile = moveTo.split("/tmp/")[1];
  const oldFile = newFile.replace("new", "original");

  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          logger.error({
            event: "SFTP connection error",
            type: "FAILED",
            error: err,
          });
          throw err;
        }
        logger.info("Retrieving new file from FTP");
        sftp.fastGet(moveFrom, moveTo, {}, (downloadErr) => {
          if (downloadErr) {
            logger.error({ event: "Download error", error: downloadErr });
            throw downloadErr;
          }

          logger.info({
            event: "Finding deletions and additions since last update",
            type: "START",
          });
          const deletions = getDeletions(oldFile, newFile).filter((d) =>
            d.trim()
          );
          const additions = getAdditions(oldFile, newFile).filter((a) =>
            a.trim()
          );

          if (deletions.length > 1000000) {
            logger.error({
              event: "List appears to be incomplete - halting sync",
              type: "FAILED",
              error: err,
            });
            throw new Error("List appears to be incomplete - halting sync");
          }

          co(function* () {
            logger.info({
              event: `Deleting ${deletions.length} records from Dynamo DB`,
              type: "START",
            });
            for (const del of deletions) {
              yield removeFromDynamo(del);
              yield wait(100);
            }
            logger.info({
              event: `Adding ${additions.length} records`,
              type: "START",
            });
            for (const add of additions) {
              yield addToDynamo(add);
              yield wait(100);
            }

            logger.info({ event: "Uploading new file to S3" });
            yield uploadToS3(fs.createReadStream(moveTo), filename);
            if (++done === 2) {
              logger.info({ event: "Done!", type: "COMPLETE" });
              process.exit(0);
            }
          }).catch((err) => {
            logger.error({
              event:
                "Error while deleting or adding numbers and uploading to Dynamodb",
              type: "FAILED",
              error: err,
            });
            process.exit(1);
          });
        });
      });
    })
    .on("error", (err) => {
      logger.error({
        event: "Connection error",
        type: "FAILED",
        error: err,
      });
      process.exit(1);
    })
    .connect(connSettings);
}

updateNumbers()


