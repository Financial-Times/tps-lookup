const fs = require("fs");
const path = require("path");
const uploadToS3 = require("../aws/upload-to-s3.js");
const logger = require("../../helper/logger.js");

function writeChangesToTmpFile(changes, filename) {
  const tmpPath = path.join("/tmp", filename);
  fs.writeFileSync(tmpPath, changes.join("\n"), "utf8");
  return tmpPath;
}

async function uploadChangesToS3(changes, key) {
  if (!Array.isArray(changes)) {
    throw new Error(`Changes must be an array before uploading to S3. Received: ${typeof changes}`);
  }

  if (changes.length === 0) {
    logger.info({
      event: "SKIP_UPLOAD_EMPTY_CHANGES_FILE",
      key,
    });
    return;
  }

  const localFilename = key.split("/").pop();
  const localPath = writeChangesToTmpFile(changes, localFilename);
  const stream = fs.createReadStream(localPath);

  logger.info({
    event: "UPLOAD_CHANGES_FILE_TO_S3",
    key,
    changesLength: changes.length,
  });

  return uploadToS3(stream, key);
}


function sanitiseListName(filename = "") {
  const base = path.basename(filename).toLowerCase();
  return base.split(".")[0]; // “tps” from “tps.txt”
}

function buildChangeKeys(filename) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  const sanitisedFilename = sanitiseListName(filename);
  const prefix = `changes/${sanitisedFilename}/${year}/${month}/${day}`;
  return {
    additionsKey: `${prefix}/${sanitisedFilename}_additions.txt`,
    deletionsKey: `${prefix}/${sanitisedFilename}_deletions.txt`,
  };
}

module.exports = {
  writeChangesToTmpFile,
  uploadChangesToS3,
  buildChangeKeys,
};
