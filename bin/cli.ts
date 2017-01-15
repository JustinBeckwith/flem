#!/usr/bin/env node
import {Builder} from '../lib/builder';
import * as program from 'commander';

let version = require('../package.json').version;

program
  .version(version)
  .option('-p, --port <port>', 'The port to listen on.', parseInt)
  .parse(process.argv);

console.log('You are listening on port %s', program['port']);
console.log(program.args);

let sourcePath = '/Users/beckwith/Code/express-test/';

let builder = new Builder();
builder.buildLive(sourcePath, 8003);

process.stdin.resume();

/**
 * Make sure to clean up any docker processes hanging around on exit. 
 */
process.on('SIGINT', () => {
  if (builder && builder.runResults && builder.runResults.server) {
    console.log('Exit docker process...');
    builder.stop(builder.runResults.name).then(() => {
      console.log('Docker process cleaned up, exiting.');
      process.exit();
    });
  }
});