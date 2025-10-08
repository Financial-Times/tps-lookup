const logger = require('./helper/logger');

function notFound(req, res, next) {
  const err = new Error('Page Not Found');
  err.status = 404;
  next(err);
}

// eslint-disable-next-line
function errorMiddleware(err, req, res, next) {
  res.status(err.status || err.statusCode || 500);

    const errorContext = {
      message: err.message,
      stack: err.stack,
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        headers: {
          'user-agent': req.headers['user-agent']
        },
      },
  };
  logger.error('Express error', errorContext);

  return res.json({
    message: err.message,
    errors: err.errors || []
  });
}

module.exports = {
  notFound,
  errorMiddleware
};
