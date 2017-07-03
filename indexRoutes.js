const express = require('express');
const authS3O = require('s3o-middleware');
const config = require('./config');
const { redirectHttps } = require('./ensureHttps');

const router = express.Router();

module.exports = (app) => {
  if (config.NODE_ENV === 'production') {
    router.use(redirectHttps);
  }
  router.use(authS3O);
  router.get('/', (req, res, next) => {
    res.sendFile(`${__dirname}/index.html`);
  });

  app.use(router);
};

