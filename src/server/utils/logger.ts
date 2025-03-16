import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: config.server.logLevel,
  format: combine(timestamp(), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Don't log to files in test environment
if (process.env.NODE_ENV === 'test') {
  logger.clear();
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat),
      silent: process.env.TEST_SILENT === 'true',
    })
  );
}

export default logger;
