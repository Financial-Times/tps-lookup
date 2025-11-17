const FormData = require('form-data');
const fetch = require('node-fetch');
const co = require('co');
const fs = require('fs');
const AWS = require('aws-sdk');
const es = require('event-stream');
const Stream = require('stream');
const { AWS_S3_BUCKET } = process.env;
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

//const s3 = new AWS.S3({ });

const form = new FormData();
form.append('f', '/www/corporate.tpsonline.org.uk//data/tps_ns.txt');
const ctpsForm = new FormData();
ctpsForm.append('f', 'f=/www/corporate.tpsonline.org.uk//data/ctps_ns.txt');

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
    const params = { Bucket: AWS_S3_BUCKET, Key: 'tps.json', Body: pass };

    s3.upload(params, (err, data) => {
      console.log(err, data);
    });

    return pass;
  }
  let count = 0;
  const res = fs.createReadStream('./CTPS.txt');
  //const cRes = fs.createReadStream('./ctps_ns.txt');
  //const res = yield fetch('https://corporate.tpsonline.org.uk/index.php/tps/get_file', options)
  //const cRes = yield fetch('http://corporate.ctpsonline.org.uk/index.php/ctps/get_file', ctpsOptions)
  //es.merge(res, cRes)
  res
    .pipe(es.split('\r\n'))
    .pipe(es.mapSync((data) => {
      if (data.trim()) {
        console.log(count++);
        return `${JSON.stringify({ phone: { S: data.trim() } })}\n`;
      }
    }))
    .pipe(fs.createWriteStream('./tps.json'));
}).catch((err) => {
  console.log(err);
});
