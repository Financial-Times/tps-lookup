module.exports = {
  ensureHttps: (req, res, next) => {
    
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      const err = new Error('Please use HTTPS when submitting data to this server');
      err.status = 403;
      return next(err);
    }
    return next();
  },

  redirectHttps: (req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.get('Host')}${req.url}`);
    }
    return next();
  },
};
