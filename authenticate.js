const authS3ONoRedirect = require('s3o-middleware').authS3ONoRedirect;
const config = require('./config');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    return next();
  }

  return authS3ONoRedirect(req, res, next);
};
