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
  let batchLogs = [];

  do {
    const data = await docClient.scan(scanParams).promise();
    const items = data.Items || [];

    for (const item of items) {
      const p = item.phone;
      const trimmed = p.trim();

      // Skip if already clean
      if (p === trimmed) continue;

      batchLogs.push({ original: p, cleaned: trimmed });

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

      // Log every 200 updates as a batch
      if (batchLogs.length === 200) {
        logger.info({
          event: "CLEANING_BATCH",
          message: `Processed 200 phone numbers so far (Total: ${totalCleaned})`,
          batchDetails: batchLogs,
        });
        batchLogs = [];
      }
    }

    lastKey = data.LastEvaluatedKey;
    scanParams.ExclusiveStartKey = lastKey;

  } while (lastKey);

  // Log remaining numbers in the final batch
  if (batchLogs.length > 0) {
    logger.info({
      event: "CLEANING_FINAL_BATCH",
      message: `Processed final ${batchLogs.length} phone numbers (Total: ${totalCleaned})`,
      batchDetails: batchLogs,
    });
  }

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
  });
  process.exit(1);
});
