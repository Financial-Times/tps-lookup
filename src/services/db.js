const AWS = require('aws-sdk');
const AWS_REGION = process.env.AWS_REGION;
const docClient = new AWS.DynamoDB.DocumentClient({region: AWS_REGION});
const dynamoDb = new AWS.DynamoDB({region: AWS_REGION});

module.exports = {
  docClient,
  dynamoDb
};

