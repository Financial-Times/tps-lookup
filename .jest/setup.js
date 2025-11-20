process.env.MY_CUSTOM_TEST_ENV_VAR = 'foo';
process.env.OKTA_CLIENT_ID = 'test-client-id';
process.env.OKTA_CLIENT_SECRET = 'test-client-secret';
process.env.OKTA_ISSUER = 'https://test.okta.com';
process.env.OKTA_APP_BASE_URL = 'http://localhost:3000';
process.env.TABLE_NAME = 'test-table';
process.env.AWS_REGION = 'us-east-1';
process.env.COOKIE_SESSION_SECRET = 'woo';
process.env.COOKIE_SESSION_MAX_AGE = 1000;
process.env.API_KEY = 'valid-key';

// Mock the logger to avoid cluttering test output
jest.mock('../helper/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));
