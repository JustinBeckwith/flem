#!/usr/bin/env node
import {Builder} from '../lib/builder';
import * as program from 'commander';

let version = require('../package.json').version;

program
  .version(version)
  .option('-p, --port <port>', 'The port to listen on.', parseInt)
  .parse(process.argv);

let sourcePath = program.args[0] || process.cwd();
let port = program['port'] || 3000;
let builder = new Builder();
builder.runHot(sourcePath, port);


process.stdin.resume();

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