const request = require('supertest');
const express = require('express');
const { docClient } = require('../services/db');
const registerSearchRoutes = require('./search');

jest.mock('../services/db', () => ({
  docClient: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../services/okta', () => ({
  okta: {
    router: jest.fn((req, res, next) => next()),
    ensureAuthenticated: jest.fn(() => (req, res, next) => next()),
    verifyJwts: jest.fn(() => (req, res, next) => next()),
  },
  sessionOptions: jest.fn((req, res, next) => next())
}));

jest.mock('../middleware/authenticate', () => jest.fn((req, res, next) => next()));

const mockDynamoResponse = (data) => ({
  promise: () => Promise.resolve(data)
});

const app = express();
app.use(express.json());
registerSearchRoutes(app);

describe('/search route', () => {

  it('should return canCall: false for a number on the TPS list', async () => {
    docClient.get.mockReturnValueOnce({
      promise: () => Promise.resolve({ Item: { phone: '07712345678' } })
    });    
    docClient.update.mockReturnValueOnce(mockDynamoResponse({}));
    const res = await request(app)
      .post('/search')
      .send(['07712345678']);

    expect(res.status).toBe(200);
    expect(res.body.results[0]).toEqual({ number: '07712345678', canCall: false });
  });

  it('should return canCall: true for a number not on the TPS list', async () => {
    docClient.get.mockReturnValueOnce(mockDynamoResponse({}));  

    const res = await request(app)
      .post('/search')
      .send(['07712345678']);

    expect(res.status).toBe(200);
    expect(res.body.results[0]).toEqual({ number: '07712345678', canCall: true });
  });

  it('should return 400 for an invalid phone number', async () => {
    const res = await request(app)
      .post('/search')
      .send(['invalid-number']);
  
    expect(res.status).toBe(400);
  });
  
});
