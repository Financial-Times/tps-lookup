const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");
const { AWS_REGION } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });

export async function uploadToS3(fileStream, key) {
  try {
    const params = {
      Bucket: "email-platform-ftcom-tps",
      Key: key,
      Body: fileStream,
    };
    return s3.upload(params).promise();
  } catch (error) {
    logger.error({
      event: "Failed to upload file to S3",
      type: "FAILED",
      error: error,
    });
    throw error;
  }
}
