const config = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module'
  },
  rules: {
    'comma-spacing': [1, { before: false, after: true }],
    'eol-last': 1,
    eqeqeq: 2,
    'guard-for-in': 2,
    indent: ['warn', 2],
    'new-cap': 0,
    'no-caller': 2,
    'no-console': 1,
    'no-extend-native': 2,
    'no-irregular-whitespace': 2,
    'no-loop-func': 2,
    'no-multi-spaces': 2,
    'no-trailing-spaces': 1,
    'no-undef': 2,
    'no-underscore-dangle': 0,
    'no-unused-vars': 2,
    'no-var': 2,
    'one-var': [2, 'never'],
    quotes: [2, 'single'],
    semi: [2, 'always'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never'
      }
    ],
    'wrap-iife': 1
  },
  globals: {
    fetch: true,
    requireText: true
  },
  ignorePatterns: ['dist/'],
  plugins: [],
  extends: [],
  overrides: [
    {
      env: { jest: true },
      files: ['**/*.test.js', '__mocks__/**/*.js']
    }
  ]
};

module.exports = config;
