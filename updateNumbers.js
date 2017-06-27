require('dotenv').load({ silent: true });

const fs = require('fs');
const co = require('co');
const { spawnSync } = require('child_process');
const Client = require('ssh2');
const AWS = require('aws-sdk');
const config = require('./config');

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion
});

const s3 = new AWS.S3({ });
const docClient = new AWS.DynamoDB.DocumentClient();

function uploadToS3(fileStream) {
  const params = { Bucket: 'email-platform-ftcom-tps', Key: 'tps.txt', Body: fileStream };
  return s3.upload(params).promise();
}

function addToDynamo(phone) {
  const params = {
    TableName: config.tableName,
    Item: {
      phone
    }
  };
  return docClient.put(params).promise();
}

function removeFromDynamo(phone) {
  const params = {
    TableName: config.tableName,
    Key: {
      phone
    }
  };
  return docClient.delete(params).promise();
}

function getDeletions() {
  const deletionCheck = spawnSync('/bin/bash', [ '-c', `
  comm -23 <(sort -n tps_original.txt) <(sort -n tps_new.txt)
    `
  ], {
    cwd: '/tmp',
    encoding: 'utf-8'
  });

  return deletionCheck.stdout.split('\r\n');
}

function getAdditions() {
  const additionCheck = spawnSync('/bin/bash', [ '-c', `
  comm -13 <(sort -n tps_original.txt) <(sort -n tps_new.txt)
    `
  ], {
    cwd: '/tmp',
    encoding: 'utf-8'
  });

  return additionCheck.stdout.split('\r\n');
}

const conn = new Client();

const connSettings = {
  host: config.sftpHost,
  port: config.sftpPort,
  username: config.sftpUsername,
  password: config.sftpPassword
};

conn.on('ready', () => {
  const moveFrom = './tps/tps_ns.txt';
  const moveTo = '/tmp/tps_new.txt';

  conn.sftp((err, sftp) => {
    if (err) {
      throw err;
    }

    console.log('Retrieving new file from FTP');
    sftp.fastGet(moveFrom, moveTo, {}, (downloadErr) => {
      if (downloadErr) {
        throw downloadErr;
      }

      console.log('Finding deletions and additions since last update');
      const deletions = getDeletions().filter(d => d.trim());
      const additions = getAdditions().filter(a => a.trim());
      co(function* () {
        console.log(`Deleting ${deletions.length} records`);
        for (const del of deletions) {
          yield removeFromDynamo(del);
        }
        console.log(`Adding ${additions.length} records`);
        for (const add of additions) {
          yield addToDynamo(add);
        }

        console.log('Uploading new file to S3');
        yield uploadToS3(fs.createReadStream('/tmp/tps_new.txt'));
        console.log('Done!');
        process.exit(0);
      }).catch((err) => {
        console.log(err);
        process.exit(1);
      });
    });
  });
}).on('error', (err) => {
  console.log(err);
  process.exit(1);
});

// Get file from S3, then from FTP
const s3Params = { Bucket: 'email-platform-ftcom-tps', Key: 'tps.txt' };
const oldFile = fs.createWriteStream('/tmp/tps_original.txt');

oldFile.on('close', () => {
  conn.connect(connSettings);
});

console.log('Downloading old file');
s3.getObject(s3Params)
  .createReadStream()
  .on('close', () => {
     console.log('Old file downloaded');
  })
  .on('error', (err) => {
    console.log(err);
  }).pipe(oldFile);
