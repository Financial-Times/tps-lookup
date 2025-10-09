const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const config = require('./config');
const healthCheck = require('./health');
const { notFound, errorMiddleware } = require('./middleware/errors');
const registerSearchRoutes = require('./routes/search');
const registerIndexRoutes = require('./routes/index');

const app = express();

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
app.use(express.static(path.join(__dirname, '..', 'dist')));
registerSearchRoutes(app);
registerIndexRoutes(app);

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.PORT, () => {
  console.log(`App listening on port ${config.PORT}`);
});
