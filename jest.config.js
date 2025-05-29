require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node', 
  testMatch: ['**/*.test.js'], 
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], 
  testTimeout: 20000,
};