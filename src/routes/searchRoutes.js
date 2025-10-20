const express = require('express');
const co = require('co');
const config = require('../../config.js');
const { docClient } = require('../services/db.js');
const { ensureHttps } = require('../../ensureHttps.js');
const authenticate = require('../../authenticate.js');
const { okta, sessionOptions } = require('../services/okta.js');
const logger = require('../../helper/logger.js');

const router = express.Router();
router.use(sessionOptions);

function validateNumber(phoneNum) {
  return /^0(?!044)[\d ]+$/.test(phoneNum);
}

module.exports = (app) => {
  if (config.NODE_ENV === 'production') {
    router.use(ensureHttps);
  }

  router.use(okta.router);
  router.use(authenticate);

  router.post('/', (req, res, next) => {
    // check body with regex for british phone number
    if (!Array.isArray(req.body)) {
      logger.error('Invalid request body', { body: req.body });
      return next({ message: 'Must provide array of numbers', status: 400 })
    }
    co(function* () {
      const results = [];

      for (const num of req.body) {
        const result = yield (function* () {
      
          if (!validateNumber(num)) {
            const err = new Error(`${num} does not match format 0xxxxxxxxxx`);
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
            const updateParams = Object.assign({}, params, {
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
      
          return {
            number: num,
            canCall: !result.Item
          };
        })();
      
        results.push(result);
      }
      
      res.json({ results });
      
    }).catch((err) => {
      logger.error(err);
      next(err);
    });
  });
  
  app.use('/search', router);
};

