import * as assert from 'assert';
import {Builder} from '../lib/builder';
import * as path from 'path';
import * as request from 'request';

describe('flem', function() {
  this.timeout(30000);

  let currentBuilder:Builder = null;

  /**
   * After each test, attempt to stop the builder. 
   */
  afterEach(() => {
    if (currentBuilder) {
      return currentBuilder.stop();
    }
  });
  
  // nodejs
  it('should build the sample node.js app', function() {
    let appPath = path.join(__dirname, 'apps/nodejs');
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3001).then(() => {
      return checkResponse("http://localhost:3001/");
    });
  });

  // ruby
  it('should build the sample ruby app', function() {
    let appPath = path.join(__dirname, 'apps/ruby');
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3002).then(() => {
      return checkResponse("http://localhost:3002/");
    });
  });

  // python
  it('should build the sample python app', function() {
    let appPath = path.join(__dirname, 'apps/ruby');
    currentBuilder = new Builder();
    return currentBuilder.runHot(appPath, 3003).then(() => {
      return checkResponse("http://localhost:3003/");
    });
  });

});



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