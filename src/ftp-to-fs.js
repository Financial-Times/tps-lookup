const co = require("co");
const wait = require("co-wait");
const { Client } = require("ssh2");
const fs = require("fs");
const logger = require("../helper/logger.js");
const { addToDynamo, removeFromDynamo } = require("./aws/dynamo.js");
const { uploadToS3 } = require("./aws/upload-to-s3.js");
const { getDeletions, getAdditions } = require("../helper/compare-files.js");
const config = require("../config.js");

const AWS = require("aws-sdk");
const config = require("../config.js");

const { AWS_REGION } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });


let done = 0;
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
module.exports = ftpToFS;
