const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const config = require('./config');
const healthCheck = require('./healthCheck');
const { notFound, errorMiddleware } = require('./errors');

const app = new express();

app.use(compression());
app.use(bodyParser.json());
app.post(`/logout`, (req, res) => {
  req.session = null;
  return res.redirect('/');
});
app.get('/__gtg', (req, res) => {
  res.send('Good to go 👍');
});
app.get('/__health', healthCheck.handle);

// require routes and mount to app
app.use(express.static(`${__dirname}/dist`));
app.get('/favicon.ico', (req, res) => {
  res.status(204).set('Cache-Control', 'private, max-age=86400').end();
});
require('./src/routes/searchRoutes')(app);
require('./src/routes/indexRoutes')(app);

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.PORT, () => {
  console.log(`App listening on port ${config.PORT}`);
});
