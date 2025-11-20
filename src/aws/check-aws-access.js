const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");

module.exports = async function checkAwsAccess() {
  const {
    AWS_REGION,
    AWS_DYNAMODB_TABLE,
    AWS_S3_BUCKET
  } = process.env;

  const s3 = new AWS.S3({region: AWS_REGION});
  const dynamoDB = new AWS.DynamoDB({region: AWS_REGION});

  try {
    logger.info({
      event: "AWS_ACCESS_CHECK",
      message: "Checking AWS access",
      region: AWS_REGION,
      dynamoDBTable: AWS_DYNAMODB_TABLE,
      s3Bucket: AWS_S3_BUCKET,
    });

    const s3Result = await s3
      .listObjectsV2({
        Bucket: AWS_S3_BUCKET,
        MaxKeys: 1,
      })
      .promise();

    logger.info({
      event: "AWS_S3_ACCESS_CHECK",
      message: "S3 access check successful",
      objectCount: s3Result.Contents?.length || 0,
      bucket: AWS_S3_BUCKET
    });

    const tableResult = await dynamoDB
      .describeTable({ TableName: AWS_DYNAMODB_TABLE })
      .promise();

    logger.info({
      message: "DynamoDB access check successful",
      event: "AWS_DYNAMODB_ACCESS_CHECK",
      table: tableResult.Table.TableName,
      itemCount: tableResult.Table.ItemCount,
    });

    return true;
  } catch (err) {
    logger.error({
      event: "AWS_ACCESS_CHECK",
      message: "AWS access check failed",
      error: err,
      code: err.code,
      statusCode: err.statusCode,
    });
    return false;
  }
};
