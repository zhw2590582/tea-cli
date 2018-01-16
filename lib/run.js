const path = require('path');
const semver = require('semver');
const exists = require('fs').existsSync;
const ora = require('ora');
const tildify = require('tildify');
const inquirer = require('inquirer');
const home = require('user-home');
const rm = require('rimraf').sync;
const download = require('download-git-repo');
const updateNotifier = require('update-notifier');
const pkg = require('meow')().pkg;

const generate = require('./generate');
const logger = require('./logger');

// 解析地址
module.exports = function run({ templateUrl, projectName, clone, offline }) {
  const hasSlash = templateUrl.indexOf('/') > -1;
  const inPlace = projectName === '.';
  const name = inPlace ? path.relative('../', process.cwd()) : projectName;
  const to = path.resolve(projectName || '.');
  const tmp = path.join(home, '.tea-templates', templateUrl.replace(/\//g, '-'));

  // 离线模式读取临时目录
  if (offline) {
    logger.warn(`> Use cached template at ${tildify(tmp)}`);
    templateUrl = tmp;
  }

  // 判断当前路径或路径已存在
  if (exists(to)) {
    inquirer.prompt([{
      type: 'confirm',
      message: inPlace ? 'Generate project in current directory?' : 'Target directory exists. Continue?',
      name: 'ok'
    }]).then(answers => {
      answers.ok && checkPath();
    }).catch(logger.fatal);
  } else {
    checkPath();
  }

  // 判断本地路径或远程路径
  function checkPath() {
    if (isLocalPath(templateUrl)) {
      // 解析本地路径
      const templatePath = getTemplatePath(templateUrl);
      if (exists(templatePath)) {
        // 渲染本地模板
        generate(name, templatePath, to, err => {
          if (err) logger.fatal(err);
          logger.success('Generated "%s".', name);
        });
      } else {
        logger.fatal('Local template "%s" not found.', templateUrl);
      }
    } else {
      // 检测版本
      updateNotifier({pkg}).notify();
      // 判断是否官方模板
      const officialTemplate = 'zhw2590582/tea-template-' + templateUrl;
      downloadAndGenerate(hasSlash ? templateUrl : officialTemplate);
    }
  }

  // 下载并渲染
  function downloadAndGenerate(templateUrl) {
    const spinner = ora('downloading template');
    spinner.start();
    if (exists(tmp)) rm(tmp);
    // 下载远程模板到临时目录
    download(templateUrl, tmp, { clone }, err => {
      spinner.stop();
      if (err) logger.fatal('Failed to download repo ' + templateUrl + ': ' + err.message.trim());
      // 渲染临时目录模板
      generate(name, tmp, to, err => {
        if (err) logger.fatal(err);
        logger.success('Generated "%s".', name);
      });
    });
  }
};

// 判断本地路径
function isLocalPath(templatePath) {
  return /^[./]|(^[a-zA-Z]:)/.test(templatePath);
}

// 解析成绝对路径
function getTemplatePath(templatePath) {
  return path.isAbsolute(templatePath)
    ? templatePath
    : path.normalize(path.join(process.cwd(), templatePath));
}

// 解析选项

// 问卷调查

// 过滤

// 构建

