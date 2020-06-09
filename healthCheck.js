const co = require('co');
const { dynamoDb } = require('./db');
const config = require('./config');

let isDBUp = true;
let dbUpLastUpdated;

function checkDBUp() {
  co(function* () {
    const check = yield dynamoDb.describeTable({ TableName: config.tableName }).promise();
    if (!['UPDATING', 'ACTIVE'].includes(check.Table.TableStatus)) {
      isDBUp = false;
    } else {
      isDBUp = true;
    }
  }).catch((err) => {
    console.log(err);
    isDBUp = false;
  });
}

exports.handle = (req, res) => {
  const health = {};

  health.schemaVersion = 1;
  health.systemCode = 'ft-tps-screener';
  health.name = 'Internal Product TPS Screener';
  health.description = 'API and Interface for screening phone numbers on the TPS/CTPS registry';
  health.checks = [];

  const dbCheckObj = {
    name: 'DynamoDB is up',
    id: 'tps-screener-db-check',
    ok: true,
    severity: 1,
    businessImpact: 'Will not be able to screen phone numbers on the TPS/CTPS registry',
    technicalSummary: 'Pings the Db connection to ensure proper status',
    panicGuide: 'First, verify that there is not a global issue with AWS/DynamoDB. ' +
    'If there is a global issue with AWS, then no further action can be taken ' +
      'to fix the issue. ' +
      'If there is no AWS/Dynamodb issue, visit the Heroku dashboard for ft-tps-screener at ' +
      'https://dashboard.heroku.com/apps/ft-tps-screener/ ' +
      'Click the "More" dropdown button and click "Restart All Dynos".',
      lastUpdated: dbUpLastUpdated
  };

  dbCheckObj.ok = isDBUp;
  health.checks.push(dbCheckObj);

  res.json(health);
};

// Wait until db connection is established before pinging DB for first time
setInterval(checkDBUp, 1000 * 10);
