const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");
const { AWS_REGION, AWS_S3_BUCKET } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });

async function uploadToS3(fileStream, key) {
  try {
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: fileStream,
    };
    logger.info({
      event: 'UPLOADING_TO_S3',
      message:'Uploading file to S3 Bucket',
      key,
      bucket: AWS_S3_BUCKET
    })
    return s3.upload(params).promise();
  } catch (error) {
    logger.error({
      event: "Failed to upload file to S3",
      type: "FAILED",
      error: error,
      bucket: AWS_S3_BUCKET,
      key: key
    });
    throw error;
  }
}
module.exports = uploadToS3;
