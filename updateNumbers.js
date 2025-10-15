require("dotenv").load({ silent: true });
const logger = require("./helper/logger.js");

const fs = require("fs");
const co = require("co");
const wait = require("co-wait");
const { spawnSync } = require("child_process");
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

async function uploadToS3(fileStream, key) {
  const params = {
    Bucket: "email-platform-ftcom-tps",
    Key: key,
    Body: fileStream,
  };
  return s3.upload(params).promise();
}

async function addToDynamo(phone) {

  try {
    const params = {
      TableName: config.tableName,
      Item: {
        phone,
        updatedAt: new Date().toISOString(),
      },
    };

    logger.info({ event: 'Adding to Dynamo', phone });

    const response = await docClient.put(params).promise();

    logger.info({ event: 'Added to Dynamo', response, phone });

    return response;
  } catch (err) {
    logger.error({ event: 'Error adding to Dynamo', error: err, phone });
  }
}

async function removeFromDynamo(phone) {
  try {
  const params = {
    TableName: config.tableName,
    Key: {
      phone,
    },
  };
  logger.info({ event: 'Removing from Dynamo', phone });
  const response = await docClient.delete(params).promise();
  logger.info({ event: 'Removed from Dynamo', response, phone });
  return response;
  } catch (err) {
    logger.error({ event: 'Error removing from Dynamo', error: err, phone });
  }
}

async function getDeletions(oldFile, newFile) {
  const deletionCheck = spawnSync(
    "/bin/bash",
    [
      "-c",
      `
  comm -23 <(sort -n ${oldFile}) <(sort -n ${newFile})
    `,
    ],
    {
      cwd: "/tmp",
      encoding: "utf-8",
    }
  );

  return deletionCheck.stdout.split("\r\n");
}

async function getAdditions(oldFile, newFile) {
  const additionCheck = spawnSync(
    "/bin/bash",
    [
      "-c",
      `
  comm -13 <(sort -n ${oldFile}) <(sort -n ${newFile})
    `,
    ],
    {
      cwd: "/tmp",
      encoding: "utf-8",
    }
  );

  return additionCheck.stdout.split("\r\n");
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
        sftp.fastGet(moveFrom, moveTo, {}, async (downloadErr) => {
          if (downloadErr) {
            logger.error({ event: "Download error", error: downloadErr });
            throw downloadErr;
          }

          logger.info({
            event: "Finding deletions and additions since last update",
            type: "START",
          });
          

          additions = await getAdditions(oldFile, newFile)
          deletions = await getDeletions(oldFile, newFile);
          for(let i = 0; i < deletions.length; i++) {
            deletions[i] = deletions[i].trim();
            if (deletions[i] === '') {
              deletions.splice(i, 1);
              i--;
            }
          }
          for(let i = 0; i < additions.length; i++) {
            additions[i] = additions[i].trim();
            if (additions[i] === '') {
              additions.splice(i, 1);
              i--;
            }
          }
          logger.info({
            event: `Found ${deletions.length} deletions and ${additions.length} additions`,
            type: "COMPLETE",
            deletions: deletions.length,
            additions: additions.length,
          });
          for (const del of deletions) {
              await removeFromDynamo(del);
              await wait(100);
            }
          
          logger.info({
            event: `Deletions complete`,
            type: "COMPLETE"
          });
          
          for (const add of additions) {
              await addToDynamo(add);
              await wait(100);
          }

          logger.info({ event: `Additions complete`, type: "COMPLETE" });
          logger.info({ event: "Uploading new file to S3" });
          
          await uploadToS3(fs.createReadStream(moveTo), filename);
          if (++done === 2) {
            logger.info({ event: "Done!", type: "COMPLETE" });
            process.exit(0);
          }
          logger.info({ event: "All done!", type: "COMPLETE" });
          throw new Error('Stopping here for safety - please remove this line to continue the process');
          if (deletions.length > 1000000) {
            logger.error({
              event: "List appears to be incomplete - halting sync",
              type: "FAILED",
              error: err,
            });
            throw new Error("List appears to be incomplete - halting sync");
          }
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
