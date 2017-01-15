import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
import Runtime from './runtimes';
import * as YAML from 'js-yaml';

export default class runtimeDetector {

  /**
   * Attempt to read the runtime from an app.yaml
   */
  public static getRuntime(dir: string): Promise<Runtime> {
    return new Promise<Runtime>((resolve, reject) => {
      let yamlPath = path.join(dir, "app.yaml");
      fs.readFile(yamlPath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        } 
        let config = YAML.safeLoad(data);
        switch(config.runtime) {
          case "node":
          case "nodejs":
            return resolve(Runtime.Nodejs);
          case "python":
            return resolve(Runtime.Python);
          case "go":
            return resolve(Runtime.Go);
          case "php":
            return resolve(Runtime.PHP);
          case "ruby":
            return resolve(Runtime.Ruby);
          case "java":
            return resolve(Runtime.Java);
          case "custom":
            return resolve(Runtime.Custom);
        }
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