module.exports = {
  require: ['tests/hooks.js', 'dotenv/config'],
  timeout: 60000,
  reporter: 'spec',
  recursive: true,
  spec: ['tests/**/*.test.js'],
};
