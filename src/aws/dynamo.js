const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");
const { AWS_REGION } = process.env;
const docClient = new AWS.DynamoDB.DocumentClient({ region: AWS_REGION });
const AWS_DYNAMO_DB_TABLE_NAME = process.env.TABLE_NAME
async function addToDynamo(phone) {
  try {
    const params = {
      TableName: AWS_DYNAMO_DB_TABLE_NAME,
      Item: {
        phone: phone.trim(),
      },
    };
    return docClient.put(params).promise();
  } catch (error) {
    logger.error({
      event: "Failed to add phone number to DynamoDB",
      type: "FAILED",
      error: error,
    });
    throw error;
  }
}

async function removeFromDynamo(phone) {
  try {
    const params = {
      TableName: AWS_DYNAMO_DB_TABLE_NAME,
      Key: {
        phone: phone.trim(),
      },
    };
    return docClient.delete(params).promise();
  } catch (error) {
    logger.error({
      event: "Failed to remove phone number from DynamoDB",
      type: "FAILED",
      error: error,
    });
    throw error;
  }
}
module.exports = { addToDynamo, removeFromDynamo };
