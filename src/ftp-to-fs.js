const co = require("co");
const wait = require("co-wait");
const { Client } = require("ssh2");
const fs = require("fs");
const logger = require("../helper/logger.js");
const { addToDynamo, removeFromDynamo } = require("./aws/dynamo.js");
const uploadToS3 = require("./aws/upload-to-s3.js");
const {
  uploadChangesToS3,
  buildChangeKeys,
} = require("./helpers/list-upload.js");
const { getDeletions, getAdditions } = require("./helpers/deletions-and-additions.js");

let done = 0;
function ftpToFS(moveFrom, moveTo, filename) {
  const conn = new Client();

  const connSettings = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
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
        logger.info({
          event: "DOWNLOAD_NEW_FILE_FROM_FTP",
          message: "Retrieving new file from FTP",
          filename
        });
        sftp.fastGet(moveFrom, moveTo, {}, (downloadErr) => {
          if (downloadErr) {
            logger.error({
              event: "DOWNLOAD_ERROR",
              message: "Error downloading new file from FTP",
              filename,
              error: downloadErr
            });
            throw downloadErr;
          }

          logger.info({
            event: "FINDING_DELETIONS_ADDITIONS",
            message: "Finding deletions and additions since last update",
            filename
          });
          const deletions = getDeletions(oldFile, newFile).filter((d) => d.trim());
          const additions = getAdditions(oldFile, newFile).filter((a) => a.trim());

          if (deletions.length > 1000000) {
            const error = new Error("List appears to be incomplete - halting sync");
            logger.error({
              event: "LIST_INCOMPLETE_HALTING_SYNC",
              filename,
              error,
            });
            throw error;
          }

          co(function* () {
            logger.info({
              event: "REMOVE_FROM_DYNAMO",
              message: `Removing ${deletions.length} records`,
              filename,
            });
            for (const del of deletions) {
              yield removeFromDynamo(del);
              yield wait(100);
            }
            logger.info({
              event: "ADD_TO_DYNAMO",
              message: `Adding ${additions.length} records`,
              filename,
            });
            for (const add of additions) {
              yield addToDynamo(add);
              yield wait(100);
            }

            const { additionsKey, deletionsKey } = buildChangeKeys(filename);

            logger.info({
              event: "UPLOAD_DELETIONS_FILE_TO_S3",
              key: deletionsKey,
              filename,
            });
            yield uploadChangesToS3(deletions, deletionsKey);

            logger.info({
              event: "UPLOAD_ADDITIONS_FILE_TO_S3",
              key: additionsKey,
              filename,
            });
            yield uploadChangesToS3(additions, additionsKey);

            logger.info({
              event: "UPLOAD_BASELINE_TO_S3",
              message: "Uploading baseline file to S3",
              filename
            });
            yield uploadToS3(fs.createReadStream(moveTo), filename);
            if (++done === 2) {
              logger.info({
                event: "UPDATE_NUMBERS_COMPLETE",
                message: "Update numbers script complete",
              });
              process.exit(0);
            }
          }).catch((err) => {
            logger.error({
              event: "UPDATE_NUMBERS_ERROR",
              message: "Error while deleting or adding numbers and uploading to Dynamodb",
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

