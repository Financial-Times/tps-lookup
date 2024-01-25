const { okta } = require('./okta.js');
const oktaNoRedirect = okta.verifyJwts({redirect:false});
const config = require('./config');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    log.info({ event: 'API Call', type: 'API request received' });
    return next()
  }

  return oktaNoRedirect(req, res, next);
};



