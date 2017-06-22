const config = exports;

config.PORT = process.env.PORT || 3000;
config.sftpHost = process.env.SFTP_HOST;
config.sftpPort = process.env.SFTP_PORT;
config.sftpUsername = process.env.SFTP_USERNAME;
config.sftpPassword = process.env.SFTP_PASSWORD;
config.awsAccessKeyId = process.env.AWS_ACCESS_KEY;
config.awsSecretAccessKey = process.env.AWS_SECRET_KEY;
config.awsRegion = process.env.AWS_REGION || 'eu-west-1';
