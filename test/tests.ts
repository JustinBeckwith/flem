import * as assert from 'assert';
import {Builder} from '../lib/builder';
import * as path from 'path';
import * as request from 'request';

describe('flem', function() {
  this.timeout(30000);
  it('should build the sample node.js app', () => {
    let appPath = path.join(__dirname, 'apps/nodejs');
    let builder = new Builder();
    return builder.runHot(appPath, 3001).then(() => {
      return checkResponse("http://localhost:3001/");
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
        pollResponse(endpoint, count--, callback);
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