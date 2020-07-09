require('dotenv').load({ silent: true });

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const compression = require('compression');
const config = require('./config');
const healthCheck = require('./healthCheck');
const { notFound, errorMiddleware } = require('./errors');

const app = new express();

// Set login to 1 day
// app.set('s3o-cookie-ttl', 86400000);


app.use(compression());
app.use(bodyParser.json());

// app.post(`/logout`, (req, res) => {
//   res.cookie('s3o_token', '', { maxAge: -1, httpOnly: true });
//   return res.redirect('/');
// });

app.post(`/logout`, (req, res) => {
  res.cookie('express.sess','', { maxAge: -1, httpOnly: true });
  return res.redirect('/');
});
app.get('/__health', healthCheck.handle);

// require routes and mount to app
app.use(express.static(`${__dirname}/dist`));
require('./searchRoutes')(app);
require('./indexRoutes')(app);

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.PORT, () => {
  console.log(`App listening on port ${config.PORT}`);
});
