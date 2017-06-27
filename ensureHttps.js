module.exports = (req, res, next) => {
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    const err = new Error('Please use HTTPS when submitting data to this server');
    err.status = 403;
    return next(err);
  }
  return next();
};
