// This script scans the DynamoDB table for phone numbers with leading or trailing
// whitespace and trims them. It uses transactions to ensure that no duplicates
// are created during the process.
const AWS = require("aws-sdk");
const config = require("../config");
const logger = require("../helper/logger");

const docClient = new AWS.DynamoDB.DocumentClient({
  region: config.awsRegion,
});

// Main function to clean existing phone numbers
const cleanExistingPhones = async () => {
  const scanParams = {
    TableName: config.tableName,
    ProjectionExpression: "phone",
  };

  let lastKey;
  let totalCleaned = 0;

  do {
    const data = await docClient.scan(scanParams).promise();
    const items = data.Items || [];

    for (const item of items) {
      const p = item.phone;
      const trimmed = p.trim();

      // skip if already clean
      if (p === trimmed) continue;

      logger.info({
        event: "CLEANING_PHONE",
        message: `Fixing "${p}" -> "${trimmed}"`,
        totalCleaned: totalCleaned + 1,
      });
      await docClient.transactWrite({
        TransactItems: [
          {
            Put: {
              TableName: config.tableName,
              Item: {
                ...item,
                phone: trimmed,
                addedAt: new Date().toISOString(),
              },
            },
          },
          {
            Delete: {
              TableName: config.tableName,
              Key: { phone: p },
            },
          },
        ],
      }).promise();

      totalCleaned++;
    }

    lastKey = data.LastEvaluatedKey;
    scanParams.ExclusiveStartKey = lastKey;

  } while (lastKey);

  logger.info({
    event: "CLEAN_COMPLETE",
    message: `Cleaned up ${totalCleaned} untrimmed phone numbers`,
  });
};

cleanExistingPhones().catch((error) => {
  logger.error({
    event: "CLEANING_ERROR",
    message: "Error cleaning phone numbers",
    error: error.message,
    totalCleaned,
  });
  process.exit(1);
});
