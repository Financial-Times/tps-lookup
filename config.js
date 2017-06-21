const config = exports;

config.PORT = process.env.PORT || 3000;
config.sftpHost = process.env.SFTP_HOST;
config.sftpPort = process.env.SFTP_PORT;
config.sftpUsername = process.env.SFTP_USERNAME;
config.sftpPassword = process.env.SFTP_PASSWORD;
