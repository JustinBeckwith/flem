import * as assert from 'assert';
import {Builder} from '../lib/builder';
import * as path from 'path';
import * as request from 'request';
import Runtime from '../lib/runtimes';

let currentBuilder:Builder = null;

describe('flem', function() {
  this.timeout(60000);

  /**
   * After each test, attempt to stop the builder. 
   */
  afterEach(() => {
    if (currentBuilder) {
      return currentBuilder.stop();
    }
  }); 
  
  checkRuntime(Runtime.Nodejs);
  checkRuntime(Runtime.Ruby);
  checkRuntime(Runtime.PHP);
  checkRuntime(Runtime.Python);
  checkRuntime(Runtime.Go);
  checkRuntime(Runtime.Custom);
});

function checkRuntime(runtime: Runtime) {
  it(`should build the sample ${runtime} app`, function() {
    let appPath = path.join(__dirname, `apps/${runtime}`);
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3000).then(() => {
      return checkResponse("http://localhost:3000/");
    });
  });
}


function checkResponse(endpoint: string) {
  return new Promise((resolve, reject) => {
    pollResponse(endpoint, 10, (result) => {
      return result ? resolve() : reject();
    });
  })
}

function pollResponse(endpoint: string, count: number, callback) {  
  console.log('polling endpoint...' + count);
  if (count <= 0) {
    console.log('out of retries, failing.');
    return callback(false);
  }
  setTimeout(() => {
    request(endpoint, (err, res, body) => {
      if (err) {
        console.log('polling err');
        pollResponse(endpoint, count-1, callback);
      } else if (body === "go-steelers") {
        console.log('polling done!');
        callback(true);
      } else {
        console.log('polling body: ' + body);
        callback(false);
      }
    });
  }, 1000);
}