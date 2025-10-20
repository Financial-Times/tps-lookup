const AWS = require('aws-sdk');
const config = require('../../config');

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion
});

const docClient = new AWS.DynamoDB.DocumentClient();
const dynamoDb = new AWS.DynamoDB();

module.exports = {
  docClient,
  dynamoDb
};

