require('dotenv').load({ silent: true });

const FormData = require('form-data');
const fetch = require('node-fetch');
const co = require('co');
const AWS = require('aws-sdk');
const es = require('event-stream');
const Stream = require('stream');
const config = require('./config');

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion
});

const s3 = new AWS.S3({ });

const form = new FormData();
form.append('f', config.tpsNS);
const ctpsForm = new FormData();
ctpsForm.append('f', config.ctpsNS);

const options = {
  method: 'POST',
  body: form
};

const ctpsOptions = {
  method: 'POST',
  body: ctpsForm
};

co(function* () {
  function uploadFromStream(s3) {
    const pass = new Stream.PassThrough();
    const params = { Bucket: 'email-platform-ftcom-signup/test/files', Key: 'tps.json', Body: pass };

    s3.upload(params, (err, data) => {
      console.log(err, data);
    });

    return pass;
  }
  let count = 0;
  const res = yield fetch(config.tpsHost, options)
  const cRes = yield fetch(config.ctpsHost, ctpsOptions)
  es.merge(res.body, cRes.body)
    .pipe(es.split('\r\n'))
    .pipe(es.mapSync((data) => {
      if (data.trim()) {
        console.log(count++);
        return `${JSON.stringify({ phone: { S: data.trim() } })}\n`;
      }
    }))
    .pipe(uploadFromStream(new AWS.S3({ })));
}).catch((err) => {
  console.log(err);
});
