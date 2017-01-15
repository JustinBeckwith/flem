import {Runtime} from './runtimes';
import * as fs from 'fs';
import * as path from 'path';
import {spawn} from 'child_process';
let chokidar = require('chokidar');

export class Builder {
  
  constructor() {
  }

  public buildLive(dir: string) {
    this.build(dir).then(() => {
      chokidar.watch(dir, { ignoreInitial:true }).on('all', (event, path) => {
        console.log('chokidar!: ' + event + ", " + path);
        this.build(dir);
      });
    }); 
  }

  public build(dir: string) {
    return new Promise<string>((resolve, reject) => {
      console.log(`building docker image in ${dir}`);
      let server = spawn('docker', [
          'build', '.', '-t', 'myapp'
        ], { 
          cwd: dir
        })
      .on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      }).on('error', (err) => {
        console.log(`child process exited with err`);
      }).on('exit', (code, signal) => {
        console.log(`child process exited with code ${code} and signal ${signal}`);
        return (code == 0) ? resolve() : reject();
      });
      server.stdout.setEncoding('utf8');
      server.stderr.setEncoding('utf8');
      server.stderr.on('data', (data) => {
        console.error(data);
      });
      server.stdout.on('data', (data) => {
        console.log(data);
      });
    });
  }

  private detectRuntime(dir: string): Runtime {
    return Runtime.Custom;
  }

}