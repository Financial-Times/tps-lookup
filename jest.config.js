require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node', 
  testMatch: ['**/*.test.js'], 
  collectCoverage: true, 
  coverageDirectory: 'coverage', 
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], 
  testTimeout: 20000,
};