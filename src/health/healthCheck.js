const AWS = require('aws-sdk');
const { dynamoDb } = require('../services/db'); // exports new AWS.DynamoDB() + DocumentClient without static creds
const HealthCheck = require('@financial-times/health-check');
const logger = require('../../helper/logger');

AWS.config.update({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-1' });

let isDBUp = false;
let dbUpLastUpdated = null;

const TABLE_NAME = process.env.TABLE_NAME;
const OKTA_APP_BASE_URL = process.env.OKTA_APP_BASE_URL;

// ---- helper: log current AWS context (whoami + creds + region + table) ----
async function logAwsContext(event = 'AWS_CONTEXT') {
  try {
    // identity
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity({}).promise();

    // credentials snapshot (mask accessKeyId)
    const creds = await new Promise((resolve, reject) =>
      AWS.config.getCredentials((err, c) => (err ? reject(err) : resolve(c)))
    );

    logger.info({
      event,
      identity,
      region: AWS.config.region,
      envRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      tableName: TABLE_NAME,
      credentials: {
        accessKeyIdPrefix: creds && creds.accessKeyId ? creds.accessKeyId.slice(0, 4) : null,
        expired: !!(creds && creds.expired),
        expireTime: creds && creds.expireTime ? creds.expireTime.toISOString?.() || String(creds.expireTime) : null,
        // provider class name hint
        provider: creds && creds.constructor ? creds.constructor.name : null
      }
    });
  } catch (e) {
    logger.error({ event: `${event}_FAILED`, error: e });
  }
}

// ---- healthcheck (external URL) ----
const healthcheck = new HealthCheck({
  checks: [
    {
      type: 'ping-url',
      name: 'TPS lookup gtg',
      id: 'tps-lookup-gtg',          // fix duplicate id
      url: OKTA_APP_BASE_URL ? `${OKTA_APP_BASE_URL}/__gtg` : 'about:blank',
      severity: 1,
      interval: 60000,
      businessImpact: 'Will not be able to check the phone numbers on the TPS/CTPS registry',
      technicalSummary: 'tps-lookup is unreachable',
      panicGuide: 'Please contact us on #crm-enablement-team'
    }
  ]
});

// ---- DynamoDB probe ----
async function checkDBUp() {
  try {
    if (!TABLE_NAME) {
      throw new Error('Missing env TABLE_NAME');
    }

    // one-time: dump context the first time we probe
    if (dbUpLastUpdated === null) {
      await logAwsContext('AWS_CONTEXT_AT_START');
    }

    const resp = await dynamoDb.describeTable({ TableName: TABLE_NAME }).promise();
    const status = resp?.Table?.TableStatus;
    const ok = status === 'ACTIVE' || status === 'UPDATING';

    isDBUp = !!ok;
    dbUpLastUpdated = new Date().toISOString();

    logger.info({
      event: ok ? 'DYNAMODB_TABLE_ACTIVE' : 'DYNAMODB_TABLE_NOT_ACTIVE',
      status,
      tableArn: resp?.Table?.TableArn,
      lastUpdated: dbUpLastUpdated
    });
  } catch (err) {
    isDBUp = false;
    dbUpLastUpdated = new Date().toISOString();

    // log rich error details
    logger.error({
      event: 'DYNAMODB_STATUS_CHECK_FAILED',
      message: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
      requestId: err?.requestId,
      retryable: err?.retryable,
      time: err?.time,
      TableName: TABLE_NAME,
      lastUpdated: dbUpLastUpdated,
      stack: err?.stack
    });

    // also capture AWS context when it fails (useful for bad creds or wrong account)
    await logAwsContext('AWS_CONTEXT_ON_FAILURE');
  }
}

// ---- express handler ----
exports.handle = async (req, res) => {
  const checks = healthcheck.toJSON();

  checks.push({
    name: 'DynamoDB is up',
    id: 'tps-screener-db-check',
    ok: isDBUp,
    severity: 1,
    businessImpact: 'Will not be able to screen phone numbers on the TPS/CTPS registry',
    technicalSummary: 'Calls DynamoDB DescribeTable to verify status',
    panicGuide:
      'Check AWS DynamoDB regional status. Verify ECS taskRole permissions for DescribeTable/Query/Scan on the table and GSIs. Ensure AWS_REGION and TABLE_NAME are set.',
    lastUpdated: dbUpLastUpdated
  });

  res.json({
    schemaVersion: 1,
    systemCode: 'ft-tps-screener',
    name: 'Internal Product TPS Screener',
    description: 'API and Interface for screening phone numbers on the TPS/CTPS registry',
    checks
  });
};

// ---- kick off immediately, then poll ----
checkDBUp();
setInterval(checkDBUp, 10_000);
