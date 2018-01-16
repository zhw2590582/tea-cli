const path = require('path');
const exists = require('fs').existsSync;
const ora = require('ora');
const match = require('minimatch');
const inquirer = require('inquirer');
const home = require('user-home');
const rm = require('rimraf').sync;
const download = require('download-git-repo');
const updateNotifier = require('update-notifier');
const Metalsmith = require('metalsmith');
const Handlebars = require('handlebars');
const async = require('async');
const render = require('consolidate').handlebars.render;
const pkg = require('../package.json');
const logger = require('./logger');

// 注册 handlebars helper
Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this)
});

Handlebars.registerHelper('unless_eq', function (a, b, opts) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this)
});

Handlebars.registerHelper('if_or', function (a, b, opts) {
  if(a || b) return opts.fn(this);
  return opts.inverse(this);
});

// 解析地址
module.exports = function run({ templateUrl, projectName, clone, offline }) {
  const hasSlash = templateUrl.indexOf('/') > -1;
  const inPlace = projectName === '.';
  const name = inPlace ? path.relative('../', process.cwd()) : projectName;
  const to = path.resolve(projectName || '.');
  const tmp = path.join(home, '.tea-templates', templateUrl.replace(/\//g, '-'));

  // 离线模式读取临时目录
  if (offline) {
    logger.warn(`> Use cached template at ${tmp}`);
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
function getOptions(name, src) {
  const json = path.join(src, 'meta.json');
  const js = path.join(src, 'meta.js');
  let opts = require(path.resolve(exists(json) ? json : js));
  if(Object.prototype.toString.call(opts) !== "[object Object]") {
    logger.fatal('meta.js or meta.json needs to expose an object');
  }
  return opts;
}

// 构建文件
function generate(name, src, dest, done) {
  // 获取选项
  const opts = getOptions(name, src);
  // 读取源目录
  const metalsmith = Metalsmith(path.join(src, 'template'));
  // 插值数据
  const data = metalsmith.metadata();
  // 注册自定义 handlebars helper
  opts.helpers && Object.keys(opts.helpers).map(key => {
    Handlebars.registerHelper(key, opts.helpers[key]);
  });
  // 暴露给钩子的辅助工具
  let helpers = { logger };
  // 触发构建前钩子
  typeof opts.before === 'function' && opts.before(metalsmith, opts, helpers);
  // 修改文件数据
  metalsmith
  .use(askQuestions(opts.prompts)) // 问卷调查
  .use(filterFiles(opts.filters)) // 文件过滤
  .use(renderTemplateFiles()) // 合成构建
  .clean(false) // 写入前是否删除目标目录
  .source('.') // 源目录 --- 相对于template， 而不是相对于src
  .destination(dest) // 目标目录
  .build((err, files) => { // 构建回调
    // 触发函数回调
    done(err);
    // 触发构建后钩子
    typeof opts.complete === 'function' && opts.complete(data, files, helpers);
  });

  return data;
}

// 插件 - 问卷调查
function askQuestions(prompts) {
  return (files, metalsmith, done) => {
    async.eachSeries(Object.keys(prompts), (key, next) => {
      // 获取插值引用
      const metalsmithMetadata = metalsmith.metadata();
      // 获取当前问卷选项
      const prompt = prompts[key];
      // 条件问题筛选
      if(prompt.when && !evaluate(prompt.when, metalsmithMetadata)) return next();
      // 收集答案并直接修改插值引用
      inquirer.prompt([{
        type: prompt.type,
        name: key,
        message: prompt.message || prompt.label || key,
        default: prompt.default,
        choices: prompt.choices || [],
        validate: prompt.validate || (() => true)
      }]).then(answers => {
          if (Array.isArray(answers[key])) {
            // 答案为数组则构建成对象（即多选）
            metalsmithMetadata[key] = {};
            answers[key].forEach(multiChoiceAnswer => {
              metalsmithMetadata[key][multiChoiceAnswer] = true;
            });
          } else if (typeof answers[key] === 'string') {
            // 答案为字符串则对双引号转义
            metalsmithMetadata[key] = answers[key].replace(/"/g, '\\"');
          } else {
            metalsmithMetadata[key] = answers[key];
          }
          next();
      }).catch(next);
    }, done);
  }
}

// 插件 - 文件过滤
function filterFiles(filters) {
  return (files, metalsmith, done) => {
    if (!filters) return done();
    const fileNames = Object.keys(files);
    const metalsmithMetadata = metalsmith.metadata();
    Object.keys(filters).forEach(glob => {
      fileNames.forEach(file => {
        if (match(file, glob, { dot: true })) {
          const condition = filters[glob];
          if (!evaluate(condition, metalsmithMetadata)) {
            delete files[file];
          }
        }
      })
    })
    done();
  }
}

// 插件 - 合成构建
function renderTemplateFiles() {
  return (files, metalsmith, done) => {
    const keys = Object.keys(files);
    const metalsmithMetadata = metalsmith.metadata();
    console.log(metalsmithMetadata)
    async.each(keys, (file, next) => {
      // 获取文件字符串
      const str = files[file].contents.toString();
      // 不存在mustaches时跳过
      if (!/{{([^{}]+)}}/g.test(str)) {
        return next();
      }
      // 合成渲染
      render(str, metalsmithMetadata, (err, res) => {
        if (err) {
          err.message = `[${file}] ${err.message}`;
          return next(err);
        }
        files[file].contents = new Buffer(res);
        next();
      });
    }, done);
  }
}

// 魔鬼的交易
function evaluate (exp, data) {
  const fn = new Function('data', 'with (data) { return ' + exp + '}');
  try {
    return fn(data);
  } catch (e) {
    logger.fatal('Error when evaluating filter condition: ' + exp);
  }
}