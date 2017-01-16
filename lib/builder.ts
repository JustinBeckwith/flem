import Runtime from './runtimes';
import * as path from 'path';
import {spawn, ChildProcess} from 'child_process';
let chokidar = require('chokidar');
let fs = require('fs-extra');
import * as _ from 'lodash';
import RuntimeDetector from './runtimeDetector';
import {EventEmitter} from 'events';
let uuid = require('uuid/v4');

export class Builder extends EventEmitter {
  
  protected runResults: RunResults;

  constructor() {
    super();
  }  

  /**
   * Perform a docker build of a given directory, and then re-build when
   * changes are made to files within the directory.  
   */
  public runHot(dir: string, port: number) {
    return this.build(dir).then((results) => {
      this.runResults = this.run(dir, 'myapp', port);
      chokidar.watch(dir, { 
          ignoreInitial: true,
          ignored: results.generatedFiles
        }).on('all', (event, path) => {
          console.log('File changed: ' + event + ", " + path);
          this.stop().then(() => {
            console.log('Process stopped, rebuilding container...');
            this.runHot(dir, port);
          });
        });
    }); 
  }

  /**
   * Run a given docker image.  
   */
  public run(dir: string, imageName: string, port: number): RunResults {
    let name = uuid();
    this.emit(AppEvents.APP_STARTING);
    let server = spawn('docker', [
          'run', '-i', '--name', name, '-p', port + ':8080', imageName
        ], { 
          cwd: dir
        })
      .on('close', (code) => {
        console.log(`RUN process exited with code ${code}`);
      }).on('error', (err) => {
        console.log(`RUN process exited with err`);
      }).on('exit', (code, signal) => {
        console.log(`RUN process exited with code ${code} and signal ${signal}`);
      });
      server.stdout.setEncoding('utf8');
      server.stderr.setEncoding('utf8');
      server.stderr.on('data', (data) => {
        console.error(data);
      });
      server.stdout.on('data', (data) => {
        console.log(data);
      });
    return {
      server: server,
      name: name
    };
  }

  /**
   * Stop a given docker process. 
   */
  public stop() {
    return new Promise((resolve, reject) => {
      this.emit(AppEvents.APP_STOPPING);
      let server = spawn('docker', [
          'stop', this.runResults.name
        ])
      .on('close', (code) => {
        console.log(`STOP process exited with code ${code}`);
      }).on('error', (err) => {
        console.log(`STOP process exited with err`);
        reject();
      }).on('exit', (code, signal) => {
        console.log(`STOP process exited with code ${code} and signal ${signal}`);
        this.emit(AppEvents.APP_STOPPED);
        resolve();
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

  /**
   * Perform the docker build of a given directory.  
   */
  public build(dir: string) {
    return new Promise<BuildResults>((resolve, reject) => {
      this.emit(AppEvents.BUILD_STARTED);
      this.prepare(dir).then((generatedFiles) => {
        console.log(`building docker image in ${dir}`);
        let server = spawn('docker', [
            'build', '.', '-t', 'myapp'
          ], { 
            cwd: dir
          })
        .on('close', (code) => {
          console.log(`BUILD process exited with code ${code}`);
        }).on('error', (err) => {
          console.log(`BUILD process exited with err`);
        }).on('exit', (code, signal) => {
          console.log(`BUILD process exited with code ${code} and signal ${signal}`);
          generatedFiles.forEach((file) => {
            fs.unlink(file, (err) => {
              if (err) {
                console.error("Error cleaning up file(s).");
              }
            })
          })
          this.emit(AppEvents.BUILD_COMPLETE);
          return (code == 0) ? resolve({ generatedFiles: generatedFiles}) : reject();
        });
        server.stdout.setEncoding('utf8');
        server.stderr.setEncoding('utf8');
        server.stderr.on('data', (data) => {
          console.error(_.trimEnd(data, ["\n"]));
        });
        server.stdout.on('data', (data) => {
          console.log(_.trimEnd(data, ["\n"]));
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
          let dockerfilePath = path.join(__dirname, "../dockerfiles", runtime.toString(), "Dockerfile");
          let dockerIgnorePath = path.join(__dirname, "../dockerfiles", ".dockerignore");
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

class BuildResults {
  public generatedFiles: Array<string>;
}

class RunResults {
  public server: ChildProcess;
  public name: string;
}

export class AppEvents {
  public static BUILD_STARTED = "BUILD_STARTED";
  public static BUILD_COMPLETE = "BUILD_COMPLETE";
  public static APP_STARTING = "APP_STARTING";
  public static APP_STARTED = "APP_STARTED";
  public static APP_RESTARTING = "APP_RESTARTING";
  public static APP_STOPPING = "APP_STOPPING";
  public static APP_STOPPED = "APP_STOPPED";
}