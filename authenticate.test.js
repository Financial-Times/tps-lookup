jest.resetModules(); // ensure a clean slate for all tests
process.env.API_KEY = 'valid-key';

describe('authenticate middleware', () => {
  it('should allow access with a valid API key', () => {
    jest.isolateModules(() => {
      jest.doMock('./src/services/okta', () => ({
        okta: {
          verifyJwts: jest.fn(() => (req, res, next) => next()) // noop
        },
      }));
  
      const authenticate = require('./authenticate');
      const req = { headers: { 'x-api-key': 'valid-key' } };
      const res = {};
      const next = jest.fn();
  
      authenticate(req, res, next);
  
      expect(next).toHaveBeenCalled();
    });
  });
  

  it('should reject access with an invalid API key', () => {
    jest.isolateModules(() => {
      const mockOktaMiddleware = jest.fn((req, res, next) => {
        res.status(401).json({ error: 'unauthorised' });
      });

      jest.doMock('./src/services/okta', () => ({
        okta: {
          verifyJwts: jest.fn(() => mockOktaMiddleware),
        },
      }));

      const authenticate = require('./authenticate');
      const req = { headers: { 'x-api-key': 'invalid-key' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'unauthorised' });
    });
  });
});
