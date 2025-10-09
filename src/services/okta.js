const oktaMiddleware = require('@financial-times/okta-express-middleware');
const session = require('express-session');

const okta = new oktaMiddleware({
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  issuer: process.env.OKTA_ISSUER,
  appBaseUrl: process.env.OKTA_APP_BASE_URL,
  scope: process.env.OKTA_SCOPE,
});

const sessionOptions = session({
  secret: process.env.COOKIE_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: Number(process.env.COOKIE_SESSION_MAX_AGE),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
});

module.exports = {
  okta,
  sessionOptions,
};
