/**
 * @fileoverview Logger utility for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

/**
 * Logger utility class for structured logging
 * Provides different log levels and consistent formatting
 */
class Logger {
  /**
   * Initialize logger with configuration
   */
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableTimestamp = true;
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  /**
   * Log levels hierarchy
   */
  static LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  /**
   * ANSI color codes for console output
   */
  static COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
  };

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.enableTimestamp ? new Date().toISOString() : '';
    const levelUpper = level.toUpperCase().padEnd(5);
    
    let formattedMessage = '';
    
    if (this.enableTimestamp) {
      formattedMessage += `[${timestamp}] `;
    }
    
    formattedMessage += `${levelUpper} - ${message}`;
    
    if (Object.keys(meta).length > 0) {
      formattedMessage += ` | ${JSON.stringify(meta)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Apply color to message based on log level
   * @param {string} level - Log level
   * @param {string} message - Message to colorize
   * @returns {string} Colorized message
   */
  colorize(level, message) {
    if (!this.enableColors) return message;
    
    const colors = {
      error: Logger.COLORS.red,
      warn: Logger.COLORS.yellow,
      info: Logger.COLORS.blue,
      debug: Logger.COLORS.cyan
    };
    
    const color = colors[level] || Logger.COLORS.reset;
    return `${color}${message}${Logger.COLORS.reset}`;
  }

  /**
   * Check if message should be logged based on current log level
   * @param {string} level - Message log level
   * @returns {boolean} Whether to log the message
   */
  shouldLog(level) {
    const currentLevelNum = Logger.LEVELS[this.logLevel] || Logger.LEVELS.info;
    const messageLevelNum = Logger.LEVELS[level] || Logger.LEVELS.info;
    return messageLevelNum <= currentLevelNum;
  }

  /**
   * Generic log method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, meta);
    const colorizedMessage = this.colorize(level, formattedMessage);
    
    // Use appropriate console method based on level
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : console.log;
    
    consoleMethod(colorizedMessage);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Log HTTP request information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} duration - Request duration in ms
   */
  logRequest(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `HTTP Request`, meta);
  }

  /**
   * Log external API call information
   * @param {string} url - API endpoint URL
   * @param {string} method - HTTP method
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  logExternalApi(url, method, statusCode, duration) {
    const meta = {
      url,
      method,
      statusCode,
      duration: `${duration}ms`
    };

    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `External API Call`, meta);
  }

  /**
   * Log data processing information
   * @param {string} operation - Processing operation
   * @param {number} recordCount - Number of records processed
   * @param {number} duration - Processing duration in ms
   */
  logDataProcessing(operation, recordCount, duration) {
    const meta = {
      operation,
      recordCount,
      duration: `${duration}ms`
    };

    this.info(`Data Processing`, meta);
  }

  /**
   * Log cache operations
   * @param {string} operation - Cache operation (hit, miss, clear, etc.)
   * @param {Object} details - Operation details
   */
  logCache(operation, details = {}) {
    const meta = {
      operation,
      ...details
    };

    this.debug(`Cache Operation`, meta);
  }
}

// Create and export singleton logger instance
const logger = new Logger();

export default logger; 