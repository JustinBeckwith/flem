import Runtime from './runtimes';
import * as path from 'path';
import {spawn, ChildProcess} from 'child_process';
import * as fs from 'fs-extra';
import { trimEnd, indexOf } from 'lodash';
import RuntimeDetector from './runtimeDetector';
import {EventEmitter} from 'events';
import * as uuid from 'uuid/v4';
import * as Handlebars from 'handlebars';
import OutputManager from './outputManager';
import ApplicationError from './applicationError';
import ConfigReader from './configReader';

export class Builder extends EventEmitter {

  protected runResults: RunResults;
  protected currentConfig: any;
  protected logger = new OutputManager(this);

  constructor() {
    super();
  }

  /**
   * Perform a docker build of a given directory, and then re-build when
   * changes are made to files within the directory.
   */
  public runHot(dir: string, port: number) {
    return this.build(dir).then((results) => {
      return this.run(dir, 'myapp', port).then(runResults => {
        this.runResults = runResults;
        this.logger.info('Running emulator on port ' + port);
        fs.watch(dir, {
          recursive: true,
        }, (event, filePath) => {
          if (indexOf(results.generatedFiles, path.join(dir, filePath as string)) == -1) {
            this.logger.info('File changed: ' + event + ", " + path.join(dir, filePath as string));
            this.stop().then(() => {
              this.logger.info('Process stopped, rebuilding container...');
              this.runHot(dir, port);
            });
          }
        });
      });
    });
  }

  /**
   * Run a given docker image.
   */
  public run(dir: string, imageName: string, port: number): Promise<RunResults> {
    let name = uuid();
    return this.getEnvVars().then(envVars => {
      let processedVars = [].concat.apply([], envVars.map(item => {
        return ['--env', item.name + "=" + item.value];
      }));
      this.emit(AppEvents.APP_STARTING);
      let server = spawn('docker', [
            'run', '-i', '--name', name, '-p', port + ':8080'
          ].concat(processedVars).concat([imageName]), {
            cwd: dir
          })
        .on('close', (code) => {
          this.logger.debug(`RUN process exited with code ${code}`);
        }).on('error', (err) => {
          this.logger.error(`RUN process exited with err`);
        }).on('exit', (code, signal) => {
          this.logger.debug(`RUN process exited with code ${code} and signal ${signal}`);
        });
        server.stdout.setEncoding('utf8');
        server.stderr.setEncoding('utf8');
        server.stderr.on('data', (data) => {
          this.logger.error(data as string);
        });
        server.stdout.on('data', (data) => {
          this.logger.info(data as string);
        });
      return {
        server: server,
        name: name
      };
    });
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
        this.logger.debug(`STOP process exited with code ${code}`);
      }).on('error', (err) => {
        this.logger.error(`STOP process exited with err ${err}`);
        return reject();
      }).on('exit', (code, signal) => {
        this.logger.debug(`STOP process exited with code ${code} and signal ${signal}`);
        this.emit(AppEvents.APP_STOPPED);
        return resolve();
      });
      server.stdout.setEncoding('utf8');
      server.stderr.setEncoding('utf8');
      server.stderr.on('data', (data) => {
        this.logger.error(data as string);
      });
      server.stdout.on('data', (data) => {
        this.logger.info(data as string);
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
        this.logger.info(`Building docker image in ${dir}...`);
        let server = spawn('docker', [
            'build', '.', '-t', 'myapp'
          ], {
            cwd: dir
          })
        .on('close', (code) => {
          this.logger.debug(`BUILD process exited with code ${code}`);
        }).on('error', (err) => {
          if (err.message == "Error: spawn docker ENOENT") {
            let message = "Flem requires Docker to be installed, and available on the path.  Please visit https://www.docker.com/ to get started, and try again.";
            let error = new ApplicationError(message);
            return reject(error);
          }
          this.logger.error(`BUILD process exited with err ${err}`);
          return reject(err);
        }).on('exit', (code, signal) => {
          this.logger.debug(`BUILD process exited with code ${code} and signal ${signal}`);
          generatedFiles.forEach((file) => {
            fs.unlink(file, (err) => {
              if (err) {
                this.logger.error("Error cleaning up file(s).");
              }
            })
          })
          this.emit(AppEvents.BUILD_COMPLETE);
          return (code == 0) ? resolve({ generatedFiles: generatedFiles}) : reject();
        });
        server.stdout.setEncoding('utf8');
        server.stderr.setEncoding('utf8');
        server.stderr.on('data', (data) => {
          this.logger.error(trimEnd(data as string, "\n"));
        });
        server.stdout.on('data', (data) => {
          this.logger.info(trimEnd(data as string, "\n"));
        });
      }).catch(err => {
        reject(err);
      });
    });
  }

  protected getEnvVars(): Promise<Array<any>> {
    let vars = [];
    let configReader = new ConfigReader();
    return configReader.getProject().then((result) => {
      let service = (this.currentConfig && this.currentConfig.service) ? this.currentConfig.service : 'default';
      vars.push({ name: "GAE_VERSION", value: "---local---" });
      vars.push({ name: "GAE_SERVICE", value: service });
      vars.push({ name: "GAE_INSTANCE", value: "---local---" });
      vars.push({ name: "GCLOUD_PROJECT", value: result });
      vars.push({ name: "PORT", value: 8080 });
      return vars;
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
        this.currentConfig = config;
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
        this.logger.debug(err);
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