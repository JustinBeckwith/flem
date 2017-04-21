import {exec} from 'child_process';
import logger from './logger';

export default class ConfigReader {
  public getProject() {
    return new Promise((resolve, reject) => {
      let cmd = "gcloud config list --format json";
      exec(cmd, (err, stdout, stderr) => {
        let project = "";
        if (err) {
          logger.debug(err.toString());
        } else {
          project = JSON.parse(stdout).core.project;
        }
        console.log(project);
        return resolve(project);
      });
    });
  }
}