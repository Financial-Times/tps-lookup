const logger = require('../helper/logger.js');
const checkAwsAccess = require('../src/aws/check-aws-access.js');
const ftpToFS = require('../src/ftp-to-fs.js');
const fs = require('fs');
const AWS = require('aws-sdk');

const { AWS_REGION, AWS_S3_BUCKET } = process.env;
const s3 = new AWS.S3({ region: AWS_REGION });

const updateNumbers = async () => {
  logger.info({
    event: 'UPDATE_NUMBERS',
    type: 'START',
    message: 'Starting updateNumbers script'
  });

  const hasAwsAccess = await checkAwsAccess();

  if (!hasAwsAccess) {
    logger.error({
      event: 'AWS_ACCESS_CHECK',
      message: 'No AWS access - exiting',
      type: 'FAILED'
    });
    process.exit(1);
  }
  // Get file from S3, then from FTP
  const tpsFileName = 'tps.txt';
  const ctpsFileName = 'ctps.txt';
  const s3ParamsTPS = { Bucket: AWS_S3_BUCKET, Key: tpsFileName };
  const s3ParamsCTPS = { Bucket: AWS_S3_BUCKET, Key: ctpsFileName };

  const oldCTPSFile = fs.createWriteStream('/tmp/ctps_original.txt');
  const oldTPSFile = fs.createWriteStream('/tmp/tps_original.txt');

  oldCTPSFile.on('close', () => {
    logger.info({
      message: 'Old CTPS file downloaded',
      event: 'OLD_FILE_DOWNLOADED',
      filename: ctpsFileName
    });
    ftpToFS('./CTPS/ctps_ns.txt', '/tmp/ctps_new.txt', ctpsFileName);
  });

  oldTPSFile.on('close', () => {
    logger.info({
      message: 'Old TPS file downloaded',
      event: 'BASELINE_FILE_DOWNLOADED',
      filename: tpsFileName
    });
    ftpToFS('./tps/tps_ns.txt', '/tmp/tps_new.txt', tpsFileName);
  });

  logger.info({
    message: 'Downloading old baseline TPS file from s3',
    event: 'DOWNLOAD_BASELINE_FILE',
    filename: tpsFileName,
    type: 'START'
  });

  s3.getObject(s3ParamsTPS)
    .createReadStream()
    .on('error', (err) => {
      logger.error({
        message: 'Failed to download old TPS files from s3',
        event: 'FAILED_TO_DOWNLOAD_BASELINE_FILE',
        filename: tpsFileName,
        type: 'FAILED',
        error: err
      });
    })
    .pipe(oldTPSFile);

  logger.info({
    message: 'Downloading old baseline CTPS file from s3',
    event: 'DOWNLOAD_BASELINE_FILE',
    filename: ctpsFileName,
    type: 'START'
  });

  s3.getObject(s3ParamsCTPS)
    .createReadStream()
    .on('error', (err) => {
      logger.error({
        message: 'Failed to download old CTPS files from s3',
        event: 'FAILED_TO_DOWNLOAD_BASELINE_FILE',
        filename: ctpsFileName,
        type: 'FAILED',
        error: err
      });
    })
    .pipe(oldCTPSFile);
};
updateNumbers();
