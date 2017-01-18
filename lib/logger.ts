let winston = require('winston');

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});
logger.level = winston.level;
logger.cli();

module.exports = logger;