import {exec} from 'child_process';
let logger = require('./logger');
import * as _ from 'lodash';

export default class ConfigReader {
  public getProject() {
    return new Promise((resolve, reject) => {
      let cmd = "gcloud config list --format json";
      exec(cmd, (err, stdout, stderr) => {
        let project = "";
        if (err) {
          logger.debug(err);
        } else {
          project = JSON.parse(stdout).core.project;
        }
        console.log(project);
        return resolve(project);
      });
    });
  }
}