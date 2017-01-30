import {EventEmitter} from 'events';

export default class OutputManager {
  
  protected root: EventEmitter;

  constructor(root: EventEmitter) {
    this.root = root;
  }

  public debug(output:string) {
    this.log('debug', output);
  }

  public error(error: Error | string) {
    if (error instanceof Error) {
      this.log('error', error.message);
    } else {
      this.log('error', error);
    }
  }

  public info(output: string) {
    this.log('info', output);
  }

  public log(log: string, output: string) {
    this.root.emit('output', output, log);
  }
}