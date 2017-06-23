require('dotenv').load({ silent: true });

const express = require('express');
const co = require('co');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const authS3O = require('s3o-middleware');
const path = require('path');
const compression = require('compression');
const config = require('./config');
const { notFound, errorMiddleware } = require('./errors');

const app = new express();

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion
});

const docClient = new AWS.DynamoDB.DocumentClient();

app.use(compression());
app.use(bodyParser.json());

app.post('/search', (req, res, next) => {
  if (!Array.isArray(req.body)) {
    return next({ message: 'Must provide array of numbers', status: 400 })
  }
  co(function* () {
    const results = yield req.body.map((num) => {
      const params = {
        TableName: 'ft-email_platform_tps_lookup',
        Key: {
          phone: num.replace(/\s/g, '')
        }
      };

      return docClient.get(params)
        .promise()
        .then((result) => {
          return Promise.resolve({
            number: num,
            canCall: result.Item ? false : true
          });
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    });
    res.json({ results });
  }).catch((err) => {
    console.log(err);
    next({ message: 'Something went wrong' });
  });
});

app.use(express.static(`${__dirname}/dist`));
app.use(authS3O);
app.get('/*', (req, res, next) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.PORT, () => {
  console.log(`App listening on port ${config.PORT}`);
});
