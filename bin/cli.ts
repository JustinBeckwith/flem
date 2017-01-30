#!/usr/bin/env node
import {Builder} from '../lib/builder';
import * as program from 'commander';
import ApplicationError from '../lib/applicationError';
let winston = require('winston');

let version = require('../package.json').version;

program
  .version(version)
  .option('-p, --port <port>', 'The port to listen on.', parseInt)
  .option('-v, --verbose', 'Enable verbose logging')
  .parse(process.argv);

// set the logging level
let loglevel = program['verbose'] ? 'debug' : 'info';
winston.level = loglevel;
winston.cli();
let sourcePath = program.args[0] || process.cwd();
let port = program['port'] || 3000;
let builder = new Builder()
  .on('output', (output, level) => {
    winston.apply(level, output);
  });

builder.runHot(sourcePath, port)
  .catch(err => {
    if (err instanceof ApplicationError) {
      winston.error(err.message);
    } else {
      winston.error(err);
    }
    process.exit();
  });

/**
 * Make sure to clean up any docker processes hanging around on exit. 
 */
process.on('SIGINT', () => {
  console.log('Exit docker process...');
  builder.stop().then(() => {
    console.log('Docker process cleaned up, exiting.');
    process.exit();
  });
});

/**
 * Keep the process open until the user cancels. 
 */
process.stdin.resume();