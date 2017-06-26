require('dotenv').load({ silent: true });

const DynamoRestore = require('dynamo-backup-to-s3').Restore;
const config = require('./config');

const restore = new DynamoRestore({
  source: 's3://email-platform-ftcom-signup/test/files/tps.json',
  table: 'ft-email_platform_tps_lookup',
  overwrite: true,
  concurrency: 1000,
  partitionkey: 'phone',
  stopOnFailure: true,
  //awsAccessKey: config.awsAccessKeyId,
  //awsSecretKey: config.awsSecretAccessKey,
  //awsSecret: config.awsSecretAccessKey,
  awsRegion: config.awsRegion
});

console.log(restore);

restore.on('error', (message) => {
  console.log(message);
  process.exit(-1);
});

restore.on('warning', (message) => {
  console.log(message);
});

restore.on('finish-batch', (l) => {
  console.log('finished batch, requests:', l);
});

restore.on('send-batch', (batches, requests, streamMeta) => {
  console.log(restore.options.concurrency);
  console.log('Batch sent. %d in flight. %d Mb remaining to download...', requests, streamMeta.RemainingLength / (1024 * 1024));
  console.log(`num cached batches ${batches}`);
});

restore.on('finish', () => {
  console.log('Finished restoring DynamoDB table');
});

restore.run(() => {
  console.log('Finished restoring DynamoDB table');
});
