const express = require('express');
const { okta, sessionOptions } = require('./okta.js');
const config = require('./config');
const { redirectHttps } = require('./ensureHttps');

const router = express.Router();
router.use(sessionOptions);
module.exports = (app) => {
  if (config.NODE_ENV === 'production') {
    router.use(redirectHttps);
    app.enable('trust proxy');  
  }
  
  router.use(okta.router);
  router.use(okta.ensureAuthenticated());
  router.use(okta.verifyJwts());
  router.get('authorization-code/callback', ({ res }) => res.redirect(302, '/'));
  router.get('/', (req, res, next) => {
    res.sendFile(`${__dirname}/index.html`);
  });

  app.use(router);
};

