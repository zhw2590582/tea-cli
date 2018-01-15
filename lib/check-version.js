const request = require('request');
const semver = require('semver');
const pkg = require('meow')().pkg;
const chalk = require('chalk');
const logger = require('./logger');

module.exports = done => {
  if (!semver.satisfies(process.version, pkg.engines.node)) {
    logger.fatal(`You must upgrade node to >= ${pkg.engines.node}.x to use tea-cli`);
  }

  request({
      url: 'https://registry.npmjs.org/tea-cli',
      timeout: 1000
    }, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        const latestVersion = JSON.parse(body)['dist-tags'].latest;
        const localVersion = pkg.version;
        if (semver.lt(localVersion, latestVersion)) {
          console.log(chalk.yellow('  A newer version of tea-cli is available.'));
          console.log();
          console.log('  latest:    ' + chalk.green(latestVersion));
          console.log('  installed: ' + chalk.red(localVersion));
          console.log();
        }
      }
      done();
    }
  );
};
