const { okta } = require('./okta.js');
const oktaNoRedirect = okta.verifyJwts({redirect:false});
const config = require('./config');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    return next()
  }

  return oktaNoRedirect(req, res, next);
};



