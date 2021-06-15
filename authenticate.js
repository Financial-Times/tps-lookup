const { okta } = require('./okta.js');
const oktaNoRedirect = okta.verifyJwts({redirect:false});
const config = require('./config');
const setUserContext = require('./setContext');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    return next()
  }

  setUserContext(req);
  return oktaNoRedirect(req, res, next);
};



