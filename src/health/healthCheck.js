const co = require('co');
const { dynamoDb } = require('../services/db');
const HealthCheck = require('@financial-times/health-check');
const logger = require('../../helper/logger');

let isDBUp = true;
let dbUpLastUpdated;

const {
  AWS_DYNAMODB_TABLE,
  NODE_ENV,
  OKTA_APP_BASE_URL
} = process.env;

const isProd = NODE_ENV === 'production';

const healthcheck = new HealthCheck({
  checks: isProd
    ? [{
        type: 'ping-url',
        name: 'TPS lookup gtg is down',
        id: 'tps-lookup-gtg',
        url: `${OKTA_APP_BASE_URL}/__gtg`,
        severity: 1,
        interval: 60000,
        businessImpact: 'Will not be able to check the phone numbers on the TPS CTPS registry',
        technicalSummary: 'tps lookup is unreachable',
        panicGuide: 'Please contact us on #crm-enablement-team'
      }]
    : []
});

function checkDBUp() {
  co(function* () {
    const check = yield dynamoDb.describeTable({ TableName: AWS_DYNAMODB_TABLE }).promise();
    isDBUp = ['UPDATING', 'ACTIVE'].includes(check.Table.TableStatus);
    dbUpLastUpdated = new Date().toISOString();
  }).catch((err) => {
    logger.error({
      message: 'Error checking DynamoDB status',
      event: 'DYNAMODB_STATUS_CHECK_FAILED',
      error: err
    });
    isDBUp = false;
    dbUpLastUpdated = new Date().toISOString();
  });
}

exports.handle = (req, res) => {
  const health = {};

  health.schemaVersion = 1;
  health.systemCode = 'ft-tps-screener';
  health.name = 'Internal Product TPS Screener';
  health.description = 'API and Interface for screening phone numbers on the TPS/CTPS registry';
  health.checks = healthcheck.toJSON();

  if (isProd) {
    const dbCheckObj = {
      name: 'DynamoDB is up',
      id: 'tps-screener-db-check',
      ok: isDBUp,
      severity: 1,
      businessImpact: 'Will not be able to screen phone numbers on the TPS/CTPS registry',
      technicalSummary: 'Pings the Db connection to ensure proper status',
      panicGuide: 'First, verify that there is not a global issue with AWS DynamoDB. ' +
        'If there is a global issue with AWS then no further action can be taken ' +
        'to fix the issue. ' +
        'If there is no AWS DynamoDB issue check the logs in Splunk and visit the app on FT Tech IP CRM Prod ',
      lastUpdated: dbUpLastUpdated
    };

    health.checks.push(dbCheckObj);
  }

  res.json(health);
};

if (isProd) {
  setInterval(checkDBUp, 1000 * 10);
}
