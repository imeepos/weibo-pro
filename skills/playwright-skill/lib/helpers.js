// helpers.js
// Reusable utility functions for Playwright automation

const browserHelpers = require('./helpers-browser');
const actionHelpers = require('./helpers-actions');

module.exports = {
  ...browserHelpers,
  ...actionHelpers
};
