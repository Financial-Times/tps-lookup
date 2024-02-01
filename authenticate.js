const { okta } = require('./okta.js');
const oktaNoRedirect = okta.verifyJwts({redirect:false});
const config = require('./config');
const logger = require('./lib/logger.js');
const log = logger.createChildLogger({});

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    log.info({ event: 'TPS Screener - API Call', type: 'API request received' });
    return next()
  }

  return oktaNoRedirect(req, res, next);
};



