module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/.jest/setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 20000
};
