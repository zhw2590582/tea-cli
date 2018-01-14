const opn = require('opn');
const ora = require('ora');
const chalk = require('chalk');
const request = require('request');
const pkg = require('meow')().pkg;
const tempDir = require('temp-dir');
const download = require('download-git-repo');
const logger = require('./logger');

module.exports = function run({ templateUrl, projectName, clone }) {
  logger.success(templateUrl, projectName, clone);
};
