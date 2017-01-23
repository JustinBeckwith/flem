import * as assert from 'assert';
import {Builder} from '../lib/builder';
import * as path from 'path';
import * as request from 'request';
import Runtime from '../lib/runtimes';

let currentBuilder:Builder = null;

describe('node.js to check other stuff tests', function() {
  this.timeout(30000);
  before(() => {
    let appPath = path.join(__dirname, `apps/nodejs`);
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3001);
  });

  it('should set the correct environment variables', function(done) {
    let endpoint = "http://localhost:3001/env";
    setTimeout(() => {
      request(endpoint, (err, res, body) => {
        if (err) {
          console.error(err);
          done(err);
        } else {
          let vars = JSON.parse(body);
          let properties = ['GAE_SERVICE', 'GAE_VERSION', 'GAE_INSTANCE', 'GCLOUD_PROJECT', 'PORT'];
          let isError = false;
          for (let property of properties) {
          console.log(property + ":" + vars[property]);
            if (!vars[property] || vars[property] === '') {
              let message = property + " is not properly set";
              console.error(message);
              done(new Error(message));
              isError = true;
            }
          }
          if (!isError) done();
        }
      })
    }, 3000);
  });

  after(() => {
    if (currentBuilder) {
      return currentBuilder.stop();
    }
  });
});

describe('flem runtime tests', function() {
  this.timeout(90000);

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
  checkRuntime(Runtime.PHP, 120000);
  checkRuntime(Runtime.Python);
  checkRuntime(Runtime.Go);
  checkRuntime(Runtime.Custom);
});

function checkRuntime(runtime: Runtime, timeout?: number) {
  it(`should build the sample ${runtime} app`, function() {
    this.timeout(timeout || 90000);
    let appPath = path.join(__dirname, `apps/${runtime}`);
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3000).then(() => {
      return new Promise((resolve, reject) => {
        pollResponse("http://localhost:3000/", 10, (err, result) => {
          if (err || result != "go-steelers") {
            return reject(err);
          } else {
            console.log('BODY: ' + result);
            return resolve();
          }
        });
      });
    });
  });
}

function pollResponse(endpoint: string, count: number, callback) {  
  console.log('polling endpoint...' + count);
  if (count <= 0) {
    console.log('out of retries, failing.');
    return callback(new Error('out of retries'));
  }
  setTimeout(() => {
    request(endpoint, (err, res, body) => {
      if (err) {
        console.log('polling err');
        pollResponse(endpoint, count-1, callback);
      } else {
        console.log('polling done!');
        callback(null, body);
      }
    });
  }, 1000);
}