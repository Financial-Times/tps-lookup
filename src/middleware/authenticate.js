const { okta } = require('../services/okta');
const config = require('../config');
const logger = require('../utils/logger');

const oktaNoRedirect = okta.verifyJwts({ redirect: false });

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    logger.info('Authenticated via API key', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return next();
  }

  return oktaNoRedirect(req, res, next);
};


