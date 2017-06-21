function notFound(req, res, next) {
  const err = new Error('Page Not Found');
  err.status = 404;
  next(err);
}

// eslint-disable-next-line
function errorMiddleware(err, req, res, next) {
  console.log(err);
  res.status(err.status || err.statusCode || 500);
  return res.json({
    message: err.message,
    errors: err.errors || []
  });
}

module.exports = {
  notFound,
  errorMiddleware
};
