const AWS = require("aws-sdk");
const logger = require("../../helper/logger.js");
const config = require("../../config.js");
const { AWS_REGION } = process.env;
const docClient = new AWS.DynamoDB.DocumentClient({ region: AWS_REGION });

export async function addToDynamo(phone) {
  try {
    const params = {
      TableName: config.tableName,
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

export async function removeFromDynamo(phone) {
  try {
    const params = {
      TableName: config.tableName,
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
