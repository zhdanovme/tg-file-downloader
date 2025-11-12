/**
 * Winston logger configuration with console and file transports
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log format for console (colorized, human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// Log format for file (JSON, structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.TG_DOWNLOADER_LOG_LEVEL || 'info',
  transports: [
    // Console transport (colorized)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport (JSON, with rotation)
    new winston.transports.File({
      filename: path.join(process.cwd(), 'data/logs/app.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Error-only file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'data/logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Export convenience methods
export default logger;
