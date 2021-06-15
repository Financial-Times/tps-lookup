const { okta } = require('./okta.js');
const oktaNoRedirect = okta.verifyJwts({redirect:false});
const config = require('./config');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    return next()
  }

  setUserContext(req);
  return oktaNoRedirect(req, res, next);
};

function setUserContext(req) {
  if (req.cookies['express:sess']) {
    const decodedToken = JSON.parse(
        Buffer.from(req.cookies['express:sess'], 'base64').toString('ascii'),
    );
    req.session = decodedToken;
    req.userContext = decodedToken.passport.user;
  } else {
    console.log('Unable to set the user context using the cookie details.');
  }
}



