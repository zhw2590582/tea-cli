const chalk = require('chalk')
const Metalsmith = require('metalsmith')
const Handlebars = require('handlebars')
const async = require('async')
const render = require('consolidate').handlebars.render
const path = require('path')
const multimatch = require('multimatch')
const getOptions = require('./options')
const ask = require('./ask')
const filter = require('./filter')
const logger = require('./logger')

module.exports = function generate(name, src, dest, done) {
  const opts = getOptions(name, src);
  const metalsmith = Metalsmith(path.join(src, 'template'))
  console.log(opts);
  done && done(null);
};
