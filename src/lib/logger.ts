import * as winston from 'winston';

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});
logger.level = winston.level;
logger.cli();

export default logger;