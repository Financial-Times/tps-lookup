const config = exports;

// Server
config.NODE_ENV = process.env.NODE_ENV || 'development';
config.PORT = process.env.PORT || 3000;

// FTP
config.sftpHost = process.env.SFTP_HOST;
config.sftpPort = process.env.SFTP_PORT;
config.sftpUsername = process.env.SFTP_USERNAME;
config.sftpPassword = process.env.SFTP_PASSWORD;

// AWS
config.tableName = process.env.TABLE_NAME || 'ft-email_platform_tps_lookup';
config.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
config.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
config.awsRegion = process.env.AWS_REGION || 'eu-west-1';
config.apiKey = process.env.API_KEY || 'development';
