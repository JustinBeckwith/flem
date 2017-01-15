#!/usr/bin/env node
import * as program from 'commander';
import {Builder} from './builder';

let version = require('./package.json').version;

program
  .version(version)
  .option('-p, --port <port>', 'The port to listen on.', parseInt)
  .parse(process.argv);

console.log('You are listening on port %s', program['port']);
console.log(program.args);

let builder = new Builder();
builder.buildLive('/Users/beckwith/Code/express-test/');

process.stdin.resume();