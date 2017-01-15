import Runtime from './runtimes';
import * as path from 'path';
import {spawn} from 'child_process';
let chokidar = require('chokidar');
let fs = require('fs-extra');
import _ from 'lodash';
import RuntimeDetector from './runtimeDetector';

export class Builder {
  
  constructor() {
  }

  /**
   * Perform a docker build of a given directory, and then re-build when
   * changes are made to files within the directory.  
   */
  public buildLive(dir: string) {
    this.build(dir).then(() => {
      chokidar.watch(dir, { ignoreInitial:true }).on('all', (event, path) => {
        console.log('chokidar!: ' + event + ", " + path);
        this.build(dir);
      });
    }); 
  }

  /**
   * Perform the docker build of a given directory.  
   */
  public build(dir: string) {
    return new Promise<string>((resolve, reject) => {
      this.prepare(dir).then((generatedFiles) => {
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
          generatedFiles.forEach((file) => {
            fs.unlink(file, (err) => {
              if (err) {
                console.error("Error cleaning up file(s).");
              }
            })
          })
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
    });
  }

  /**
   * If needed, generate a Dockerfile and .dockerignore file inside
   * of the given directory, based on it's contents. Returns an Array
   * of generated file paths.  
   */
  protected prepare(dir: string): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      RuntimeDetector.getRuntime(dir).then((runtime: Runtime) => {
        if (runtime != Runtime.Custom) {
          let dockerfilePath = path.join(__dirname, "dockerfiles", runtime.toString(), "Dockerfile");
          let dockerIgnorePath = path.join(__dirname, "dockerfiles", ".dockerignore");
          let generatedDockerfilePath = path.join(dir, "Dockerfile");
          let generatedDockerIgnorePath = path.join(dir, ".dockerignore");
          fs.copy(dockerfilePath, generatedDockerfilePath, (err) => {
            if (err) return reject(err);
            fs.copy(dockerIgnorePath, generatedDockerIgnorePath, (err) => {
              if (err) return reject(err);
              return resolve([generatedDockerfilePath, generatedDockerIgnorePath]);
            });
          });
        } else {
          return resolve([]);
        }
      });
    });
  }


}