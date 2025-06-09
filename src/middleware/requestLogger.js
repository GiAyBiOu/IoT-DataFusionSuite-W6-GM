/**
 * Request Logger Middleware
 * Logs incoming HTTP requests with timestamp and method
 */

import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    timestamp
  });
  next();
}; 