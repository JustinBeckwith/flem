import Runtime from './runtimes';
import * as path from 'path';
import {spawn, ChildProcess} from 'child_process';
let chokidar = require('chokidar');
let fs = require('fs-extra');
import * as _ from 'lodash';
import RuntimeDetector from './runtimeDetector';
import {EventEmitter} from 'events';
let uuid = require('uuid/v4');
let Handlebars = require('handlebars');
let logger = require('./logger');
import ApplicationError from './applicationError';

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
      logger.info('Running emulator on port %s', port);
      chokidar.watch(dir, { 
          ignoreInitial: true,
          ignored: results.generatedFiles
        }).on('all', (event, path) => {
          logger.info('File changed: ' + event + ", " + path);
          this.stop().then(() => {
            logger.info('Process stopped, rebuilding container...');
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
        logger.debug(`RUN process exited with code ${code}`);
      }).on('error', (err) => {
        logger.error(`RUN process exited with err`);
      }).on('exit', (code, signal) => {
        logger.debug(`RUN process exited with code ${code} and signal ${signal}`);
      });
      server.stdout.setEncoding('utf8');
      server.stderr.setEncoding('utf8');
      server.stderr.on('data', (data) => {
        logger.error(data);
      });
      server.stdout.on('data', (data) => {
        logger.info(data);
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
        logger.debug(`STOP process exited with code ${code}`);
      }).on('error', (err) => {
        logger.error(`STOP process exited with err ${err}`);
        return reject();
      }).on('exit', (code, signal) => {
        logger.debug(`STOP process exited with code ${code} and signal ${signal}`);
        this.emit(AppEvents.APP_STOPPED);
        return resolve();
      });
      server.stdout.setEncoding('utf8');
      server.stderr.setEncoding('utf8');
      server.stderr.on('data', (data) => {
        logger.error(data);
      });
      server.stdout.on('data', (data) => {
        logger.info(data);
      });
    });
  }

  /**
   * Perform the docker build of a given directory.  
   */
  public build(dir: string): Promise<BuildResults> {
    return new Promise<BuildResults>((resolve, reject) => {
      this.emit(AppEvents.BUILD_STARTED);
      this.prepare(dir).then(generatedFiles => {
        logger.info(`Building docker image in ${dir}...`);
        let server = spawn('docker', [
            'build', '.', '-t', 'myapp'
          ], { 
            cwd: dir
          })
        .on('close', (code) => {
          logger.debug(`BUILD process exited with code ${code}`);
        }).on('error', (err) => {
          if (err == "Error: spawn docker ENOENT") {
            let message = "Flem requires Docker to be installed, and available on the path.  Please visit https://www.docker.com/ to get started, and try again.";
            let error = new ApplicationError(message);
            return reject(error);
          }
          logger.error(`BUILD process exited with err ${err}`);
          return reject(err);
        }).on('exit', (code, signal) => {
          logger.debug(`BUILD process exited with code ${code} and signal ${signal}`);
          generatedFiles.forEach((file) => {
            fs.unlink(file, (err) => {
              if (err) {
                logger.error("Error cleaning up file(s).");
              }
            })
          })
          this.emit(AppEvents.BUILD_COMPLETE);
          return (code == 0) ? resolve({ generatedFiles: generatedFiles}) : reject();
        });
        server.stdout.setEncoding('utf8');
        server.stderr.setEncoding('utf8');
        server.stderr.on('data', (data) => {
          logger.error(_.trimEnd(data, ["\n"]));
        });
        server.stdout.on('data', (data) => {
          logger.info(_.trimEnd(data, ["\n"]));
        });
      }).catch(err => {
        reject(err);
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
      RuntimeDetector.getConfig(dir).then((config: any) => {
        let runtime = RuntimeDetector.getRuntime(config);
        if (runtime != Runtime.Custom) {
          let dockerfilePath = path.join(__dirname, "../dockerfiles", runtime.toString(), "Dockerfile");
          let dockerIgnorePath = path.join(__dirname, "../dockerfiles", ".dockerignore");
          let generatedDockerfilePath = path.join(dir, "Dockerfile");
          let generatedDockerIgnorePath = path.join(dir, ".dockerignore");
          fs.readFile(dockerfilePath, 'utf-8', (err, data) => {
            if (err) return resolve(err);
            let template = Handlebars.compile(data);
            let context: any = { entrypoint: config.entrypoint };
            if (runtime == Runtime.Python) {
              if (config.runtime_config && config.runtime_config.python_version) {
                if (config.runtime_config.python_version == 2) {
                  context.python_version = "python";
                } else if (config.runtime_config.python_version == 3) {
                  context.python_version = "python3.5";
                } else {
                  return reject(new ApplicationError("Invalid python runtime selected."));
                }
              } else {
                context.python_version = "python";
              }
            } else if (runtime == Runtime.PHP) {
              context.document_root = "/app";
              if (config.runtime_config && config.runtime_config.document_root) {
                context.document_root = path.join('/app', config.runtime_config.document_root);
              }
            }
            let output = template(context);
            fs.writeFile(generatedDockerfilePath, output, (err) => {
              if (err) return reject(err);
              fs.copy(dockerIgnorePath, generatedDockerIgnorePath, (err) => {
                if (err) return reject(err);
                return resolve([generatedDockerfilePath, generatedDockerIgnorePath]);
              });
            });
          });
        } else {
          return resolve([]);
        }
      }).catch(err => {
        logger.debug(err);
        return reject(err);
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