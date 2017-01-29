/**
 * A simple example of using flem as an npm module. Create a new builder, 
 * and then build!
 */

let Flem = require('../lib/index');
let flem = new Flem();
flem.build('./test/apps/nodejs').then(result => {
  console.log(result);
}).catch(err => {
  console.error(err);
});