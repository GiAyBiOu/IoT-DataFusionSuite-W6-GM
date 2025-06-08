/**
 * @fileoverview Error handling middleware for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import logger from '../utils/logger.js';

/**
 * Custom API Error class
 * Extends Error to include HTTP status codes and additional metadata
 */
class ApiError extends Error {
  /**
   * Create an API Error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isOperational - Whether the error is operational
   * @param {string} stack - Error stack trace
   */
  constructor(message, statusCode = 500, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Create a new API Error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {boolean} isOperational - Whether the error is operational
 * @returns {ApiError} New API Error instance
 */
const createApiError = (message, statusCode = 500, isOperational = true) => {
  return new ApiError(message, statusCode, isOperational);
};

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('HTTP Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode: err.statusCode || 500
  });

  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = createApiError(message, 400);
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = createApiError(message, 400);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = createApiError(message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = createApiError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please log in again.';
    error = createApiError(message, 401);
  }

  if (err.isAxiosError) {
    const message = err.response?.data?.message || 'External API request failed';
    const statusCode = err.response?.status || 503;
    error = createApiError(message, statusCode);
  }

  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    const message = 'Request timeout. Please try again later.';
    error = createApiError(message, 408);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 * Wraps async functions to catch errors and pass them to error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler middleware
 * Handles requests to non-existent endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = createApiError(
    `Endpoint not found - ${req.originalUrl}`,
    404
  );
  next(error);
};

/**
 * Request validation error handler
 * Handles validation errors from request validation middleware
 * @param {Array} errors - Array of validation errors
 * @returns {ApiError} API Error instance
 */
const handleValidationError = (errors) => {
  const errorMessages = errors.map(error => error.msg).join(', ');
  return createApiError(`Validation Error: ${errorMessages}`, 400);
};

export {
  ApiError,
  createApiError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleValidationError
}; 