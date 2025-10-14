require("dotenv").load({ silent: true });
const logger = require("./helper/logger.js");

const fs = require("fs");
const co = require("co");
const wait = require("co-wait");
const { spawnSync } = require("child_process");
const SHELL = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';
const { Client } = require("ssh2");
const AWS = require("aws-sdk");
const config = require("./config");

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion,
});

const s3 = new AWS.S3({});
const docClient = new AWS.DynamoDB.DocumentClient();
const dynamoDB = new AWS.DynamoDB();

async function checkAwsAccess() {
  try {
    const s3Result = await s3.listObjectsV2({ Bucket: "email-platform-ftcom-tps", MaxKeys: 1 }).promise();
    logger.info({ event: "S3 access check successful", objects: s3Result.Contents.length });
    const result = await dynamoDB.describeTable({ TableName: config.tableName }).promise();
    logger.info({ event: "DynamoDB table access check successful", table: result.Table.TableName });

  } catch (err) {
    logger.error({ event: "DynamoDB table access check failed", error: err });
    process.exit(1);
  }
}

checkAwsAccess().then(() => {
  logger.info({ event: 'AWS access confirmed' });
});

let done = 0;

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
      phone,
    },
  };
  return docClient.put(params).promise();
}

function removeFromDynamo(phone) {
  const params = {
    TableName: config.tableName,
    Key: {
      phone,
    },
  };
  return docClient.delete(params).promise();
}

function getDeletions(oldFile, newFile) {
  const { stdout, stderr, status, error } = spawnSync(
    SHELL,
    ['-c', `
      set -euo pipefail
      oldS=/tmp/.old.$$; newS=/tmp/.new.$$
      sort -n -- "${oldFile}" > "$oldS"
      sort -n -- "${newFile}" > "$newS"
      comm -23 "$oldS" "$newS"
      rm -f "$oldS" "$newS"
    `],
    { cwd: '/tmp', encoding: 'utf-8'}
  );

  if (status !== 0 || error) {
    logger.error({
      event: 'GET_DELETIONS',
      message: 'getDeletions failed',
      status,
      stderr,
      error
    });
    throw new Error('getDeletions shell command failed');
  }

  return String(stdout || '').split(/\r?\n/).filter(Boolean);
}

function getAdditions(oldFile, newFile) {
  const { stdout, stderr, status, error } = spawnSync(
    SHELL,
    ['-c', `
      set -euo pipefail
      oldS=/tmp/.old.$$; newS=/tmp/.new.$$
      sort -n -- "${oldFile}" > "$oldS"
      sort -n -- "${newFile}" > "$newS"
      comm -13 "$oldS" "$newS"
      rm -f "$oldS" "$newS"
    `],
    { cwd: '/tmp', encoding: 'utf-8' }
  );

  if (status !== 0 || error) {
    logger.error({
      event: 'GET_ADDITIONS',
      message: 'getAdditions failed',
      status,
      stderr,
      error
    });
    throw new Error('getAdditions shell command failed');
  }

  return String(stdout || '').split(/\r?\n/).filter(Boolean);
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
