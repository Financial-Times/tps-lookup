jest.mock('express-session');
const session = require('express-session');

require('./okta');

jest.mock('@financial-times/okta-express-middleware', () =>
  jest.fn(() => ({
    router: jest.fn((req, res, next) => next()),
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    verifyJwts: jest.fn((req, res, next) => next())
  }))
);

describe('Okta Session Options', () => {
  it('should initialise session with correct options', () => {
    expect(session).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: expect.any(String),
        resave: false,
        saveUninitialized: false,
        cookie: expect.objectContaining({
          maxAge: expect.any(Number),
          httpOnly: true,
          secure: expect.any(Boolean)
        })
      })
    );
  });
});
