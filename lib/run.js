const opn = require('opn');
const ora = require('ora');
const chalk = require('chalk');
const request = require('request');
const pkg = require('meow')().pkg;
const tempDir = require('temp-dir');

module.exports = function run({ templateUrl, projectName }) {
  console.log(tempDir, __dirname);
};
