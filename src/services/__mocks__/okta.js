module.exports = {
  okta: {
    router: jest.fn((req, res, next) => next()),
    ensureAuthenticated: jest.fn(() => (req, res, next) => next()),
    verifyJwts: jest.fn(() => (req, res, next) => next()),
  },
  sessionOptions: jest.fn((req, res, next) => next()),
};
