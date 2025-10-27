const DynamoRestore = require('dynamo-backup-to-s3').Restore;
const config = require('../config');

const restore = new DynamoRestore({
  source: 's3://email-platform-ftcom-signup/test/files/tps.json',
  table: 'ft-email_platform_tps_lookup',
  overwrite: true,
  concurrency: 1000,
  partitionkey: 'phone',
  stopOnFailure: true,
  awsAccessKey: config.awsAccessKeyId,
  awsSecretKey: config.awsSecretAccessKey,
  awsSecret: config.awsSecretAccessKey,
  awsRegion: config.awsRegion
});

restore.on('error', (message) => {
  logger.error({
    event: 'DYNAMO_RESTORE_ERROR',
    error: message
  })
  process.exit(-1);
});

restore.on('warning', (message) => {
  logger.warn({
    event: 'DYNAMO_RESTORE_WARNING',
    warning: message
  });
});

restore.on('finish-batch', (l) => {
  logger.info({
    event: 'DYNAMO_RESTORE_BATCH_FINISHED',
    itemsInBatch: l
  });
});

restore.on('send-batch', (batches, requests, streamMeta) => {
  logger.info({
    event: 'DYNAMO_RESTORE_BATCH_SENT',
    concurrency: restore.options.concurrency,
    inFlightRequests: requests,
    remainingLengthMb: streamMeta.RemainingLength / (1024 * 1024),
    cachedBatches: batches
  });
});

restore.on('finish', () => {
  logger.info({
    event: 'DYNAMO_RESTORE_FINISHED',
    table: restore.options.table
  });
});

restore.run(() => {
  logger.info({
    event: 'DYNAMO_RESTORE_RUN_FINISHED',
    table: restore.options.table
  });
});
