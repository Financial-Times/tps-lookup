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
  return s3.upload(params);
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
  (sort -n -o tps_original.txt tps_original.txt &
  sort -n -o tps_new.txt tps_new.txt &
  wait
  comm -23 tps_original.txt tps_new.txt
  )
    `
  ], {
    cwd: '/tmp',
    encoding: 'utf-8'
  });

  return deletionCheck.stdout.split('\r\n');
}

function getAdditions() {
  const additionCheck = spawnSync('/bin/bash', [ '-c', `
  (sort -n -o tps_original.txt tps_original.txt &
  sort -n -o tps_new.txt tps_new.txt &
  wait
  comm -13 tps_original.txt tps_new.txt
  )
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

    sftp.fastGet(moveFrom, moveTo, {}, (downloadErr) => {
      if (downloadErr) {
        throw downloadErr;
      }

      const deletions = getDeletions();
      const additions = getAdditions();
      co(function* () {
        for (const del of deletions) {
          if (del) {
            yield removeFromDynamo(del.trim());
          }
        }
        for (const add of additions) {
          if (add) {
            yield addToDynamodb(add.trim());
          }
        }

        yield uploadToS3(fs.createReadStream('/tmp/tps_new.txt'));
      });
    });
  });
})

// Get file from S3, then from FTP
const s3Params = { Bucket: 'email-platform-ftcom-tps', Key: 'tps.txt' };
const oldFile = fs.createWriteStream('/tmp/tps_original.txt');

file.on('close', () => {
  conn.connect(connSettings);
});

s3.getObject(s3Params)
  .createReadStream()
  .on('error', (err) => {
    console.log(err);
  }).pipe(file);
