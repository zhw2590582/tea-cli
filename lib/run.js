const path = require('path');
const exists = require('fs').existsSync;
const ora = require('ora');
const inquirer = require('inquirer');
const home = require('user-home');
const pkg = require('meow')().pkg;
const rm = require('rimraf').sync;
const download = require('download-git-repo');
const generate = require('./generate');
const checkVersion = require('./check-version');
const logger = require('./logger');
const localPath = require('./local-path');
const isLocalPath = localPath.isLocalPath;
const getTemplatePath = localPath.getTemplatePath;

module.exports = function run({ templateUrl, projectName, clone, offline }) {
  const hasSlash = templateUrl.indexOf('/') > -1;
  const inPlace = projectName === '.';
  const name = inPlace ? path.relative('../', process.cwd()) : projectName;
  const to = path.resolve(projectName || '.');
  const tmp = path.join(home, '.tea-templates', templateUrl.replace(/\//g, '-'));

  if (exists(to)) {
    inquirer
      .prompt([
        {
          type: 'confirm',
          message: inPlace
            ? 'Generate project in current directory?'
            : 'Target directory exists. Continue?',
          name: 'ok'
        }
      ])
      .then(answers => {
        if (answers.ok) {
          checkPath();
        }
      })
      .catch(logger.fatal);
  } else {
    checkPath();
  }

  function checkPath() {
    if (isLocalPath(templateUrl)) {
      const templatePath = getTemplatePath(templateUrl);
      if (exists(templatePath)) {
        generate(name, templatePath, to, err => {
          if (err) logger.fatal(err);
          logger.success('Generated "%s".', name);
        });
      } else {
        logger.fatal('Local template "%s" not found.', templateUrl);
      }
    } else {
      checkVersion(() => {
        const officialTemplate = 'vuejs-templates/' + templateUrl;
        downloadAndGenerate(hasSlash ? templateUrl : officialTemplate);
      });
    }
  }

  function downloadAndGenerate(templateUrl) {
    const spinner = ora('downloading template');
    spinner.start();
    if (exists(tmp)) rm(tmp);
    download(templateUrl, tmp, { clone }, err => {
      spinner.stop()
      if (err) logger.fatal('Failed to download repo ' + template + ': ' + err.message.trim())
      generate(name, tmp, to, err => {
        if (err) logger.fatal(err)
        logger.success('Generated "%s".', name)
      })
    })
  }
};
