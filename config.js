const config = exports;

config.NODE_ENV = process.env.NODE_ENV || 'development';
config.PORT = process.env.PORT || 3000;

config.tableName = process.env.TABLE_NAME || 'ft-email_platform_tps_lookup';
config.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
config.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
config.awsRegion = process.env.AWS_REGION || 'eu-west-1';
config.apiKey = process.env.API_KEY || 'development';

config.tpsNS = process.env.TPS_NS;
config.ctpsNS = process.env.CTPS_NS;
config.tpsHost = process.env.TPS_HOST;
config.ctpsHost = process.env.CTPS_HOST;
