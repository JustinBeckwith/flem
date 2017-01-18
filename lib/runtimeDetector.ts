import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
import Runtime from './runtimes';
import * as YAML from 'js-yaml';
let logger = require('./logger');

export default class runtimeDetector {

  /**
   * Attempt to read the runtime from an app.yaml
   */
  public static getRuntime(config): Runtime {
    switch(config.runtime) {
      case "node":
      case "nodejs":
        return Runtime.Nodejs;
      case "python":
        return Runtime.Python;
      case "go":
        return Runtime.Go;
      case "php":
        return Runtime.PHP;
      case "ruby":
        return Runtime.Ruby;
      case "java":
        return Runtime.Java;
      case "custom":
        return Runtime.Custom;
    }
  }

  public static getConfig(dir: string) {
    return new Promise((resolve, reject) => {
      let yamlPath = path.join(dir, "app.yaml");
      fs.readFile(yamlPath, 'utf8', (err, data) => {
        if (err) {
          logger.error("No app.yaml found in the given directory.");
          return reject(err);
        } 
        let config = YAML.safeLoad(data);
        return resolve(config);
      });
    });
  }

  private detectRuntime(dir: string): Promise<Runtime> {
    return new Promise<Runtime>((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (this.isCustom(files)) return resolve(Runtime.Custom);
        if (this.isPython(files)) return resolve(Runtime.Python);
        if (this.isRuby(files)) return resolve(Runtime.Ruby);
        if (this.isGo(files)) return resolve(Runtime.Go);
        if (this.isPHP(files)) return resolve(Runtime.PHP);
        if (this.isDotNet(files)) return resolve(Runtime.PHP);
        if (this.isNodejs(files)) return resolve(Runtime.Nodejs);
      });
    });
  }

  private isNodejs(files: Array<string>): boolean {
    return this.containsFile(files, "package.json");
  }

  private isDotNet(files: Array<string>): boolean {
    return (
      this.containsFileExtension(files, ".csproj") ||
      this.containsFileExtension(files, ".cs")
    );
  }

  private isCustom(files: Array<string>): boolean {
    return this.containsFile(files, "Dockerfile");
  }

  private isRuby(files: Array<string>): boolean {
    return this.containsFile(files, "gemfile");
  }

  private isPython(files: Array<string>): boolean {
    return this.containsFile(files, "requirements.txt");
  }

  private isPHP(files: Array<string>): boolean {
    return (
      this.containsFile(files, "composer.json") || 
      this.containsFileExtension(files, ".php")
    );
  }

  private isGo(files: Array<string>): boolean {
    return this.containsFileExtension(files, ".go");
  }

  private containsFile(files: Array<string>, name: string): boolean {
    for (let f of files) {
      let item = path.basename(f).toLowerCase();
      if (item === name) {
        return true;
      }
    }
    return false;
  }

  private containsFileExtension(files: Array<string>, extension: string): boolean {
    for (let f of files) {
      let item = path.extname(f).toLowerCase();
      if (item === extension) {
        return true;
      }
    }
    return false;
  }

}