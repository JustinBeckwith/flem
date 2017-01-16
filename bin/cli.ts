#!/usr/bin/env node
import {Builder} from '../lib/builder';
import * as program from 'commander';

let version = require('../package.json').version;

program
  .version(version)
  .option('-p, --port <port>', 'The port to listen on.', parseInt)
  .parse(process.argv);

console.log('You are listening on port %s', program['port']);
let sourcePath = program.args[0];

let builder = new Builder();
builder.runHot(sourcePath, program['port']);

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