require('dotenv').load({ silent: true });

const express = require('express');
const co = require('co');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const authS3O = require('s3o-middleware');
const authenticate = require('./authenticate');
const path = require('path');
const compression = require('compression');
const config = require('./config');
const ensureHttps = require('./ensureHttps');
const { notFound, errorMiddleware } = require('./errors');

const app = new express();

AWS.config.update({
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion
});

const docClient = new AWS.DynamoDB.DocumentClient();

function validateNumber(phoneNum) {
  return /^0(?!044)[\d ]+$/.test(phoneNum);
}

if (config.NODE_ENV === 'production') {
  app.use(ensureHttps);
}
app.use(compression());
app.use(bodyParser.json());

app.post('/search', authenticate, (req, res, next) => {
  // check body with regex for british phone number
  if (!Array.isArray(req.body)) {
    return next({ message: 'Must provide array of numbers', status: 400 })
  }
  co(function* () {
    const results = yield req.body.map(function* (num) {
      if (!validateNumber(num)) {
        const err = new Error(`${num} does not match format 0xxxxxxxxxx`)
        err.status = 400;
        throw err; 
      }
      const params = {
        TableName: config.tableName,
        Key: {
          phone: num.replace(/\s/g, '')
        }
      };

      const result = yield docClient.get(params).promise();
      if (result.Item) {
        const updateParams = Object.assign({}, params,
            {
              ExpressionAttributeNames: {
                '#d': 'lastRetrieved'
              },
              ExpressionAttributeValues: {
                ':d': JSON.stringify(new Date())
              },
              UpdateExpression: 'SET #d = :d'
            });
        yield docClient.update(updateParams).promise();
      }

      return Promise.resolve({
        number: num,
        canCall: result.Item ? false : true
      });
    });
    res.json({ results });
  }).catch((err) => {
    console.log(err);
    next(err);
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
