#!/usr/bin/env node
const meow = require('meow');
const run = require('../lib/run');

const cli = meow(
  `
    Use official templates
      $ tea <template-name> <project-name>

    Use custom templates
      $ tea <username/repo> <project-name>

    Use local templates
      $ tea <~/fs/path/to-custom-template> <project-name>
    
    Show current version
      $ tea -v

    Show help
      $ tea -h
`,
  {
    flags: {
      offline: {
        type: 'boolean',
        alias: 'o'
      },
      clone: {
        type: 'boolean',
        alias: 'c'
      },
      version: {
        type: 'boolean',
        alias: 'v'
      },
      help: {
        type: 'boolean',
        alias: 'h'
      }
    }
  }
);

const templateUrl = cli.input[0];
const projectName = cli.input[1];

if (!templateUrl || !projectName) {
  cli.showHelp();
}

run({
  templateUrl: templateUrl,
  projectName: projectName,
  clone: cli.flags.clone || false,
  offline: cli.flags.offline || false
});
