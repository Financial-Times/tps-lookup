const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");

module.exports = async function checkAwsAccess() {

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const tableName = process.env.TABLE_NAME;
  
  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region,
  });

  const s3 = new AWS.S3();
  const dynamoDB = new AWS.DynamoDB();

  try {
    logger.info({
      event: "Checking AWS access",
      accessKeyId: accessKeyId ? accessKeyId.slice(0, 4) + "****" : "not provided",
      region,
    });

    const s3Result = await s3
      .listObjectsV2({
        Bucket: "email-platform-ftcom-tps",
        MaxKeys: 1,
      })
      .promise();

    logger.info({
      event: "S3 access check successful",
      objectCount: s3Result.Contents?.length || 0,
      bucket: s3Result.Name,
    });

    const tableResult = await dynamoDB
      .describeTable({ TableName: tableName })
      .promise();

    logger.info({
      event: "DynamoDB access check successful",
      table: tableResult.Table.TableName,
      itemCount: tableResult.Table.ItemCount,
    });

    return true;
  } catch (err) {
    logger.error({
      event: "AWS access check failed",
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
    return false;
  }
};
