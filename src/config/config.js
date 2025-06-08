/**
 * @fileoverview Configuration settings for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

/**
 * Application configuration object
 * Contains all configuration settings for the API
 */
const config = {
  /**
   * Server port configuration
   * Uses environment variable or defaults to 3000
   */
  port: process.env.PORT || 3000,

  /**
   * External API configuration
   * Sigfox IoT data endpoint
   */
  externalApi: {
    sigfoxEndpoint: 'https://callback-iot.onrender.com/data',
    timeout: 10000, // 10 seconds timeout
    retries: 3
  },

  /**
   * API configuration
   */
  api: {
    version: '1.0.0',
    prefix: '/api',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  },

  /**
   * Data processing configuration
   */
  data: {
    maxRecords: 2,
    cacheTimeout: 30000
  },

  /**
   * CORS configuration
   */
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  /**
   * Security configuration
   */
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }
  },

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.NODE_ENV !== 'production'
  },

  /**
   * Environment configuration
   */
  environment: process.env.NODE_ENV || 'development',

  /**
   * Swagger documentation configuration
   */
  swagger: {
    title: 'IoT Data Fusion Suite API',
    description: 'API for fetching and visualizing Sigfox IoT device data',
    version: '1.0.0',
    contact: {
      name: 'Gabriel Mendoza',
      email: 'gabriel.mendoza@iot-datafusion.com'
    }
  }
};

/**
 * Validate required configuration
 * Ensures all critical configuration values are present
 */
function validateConfig() {
  const requiredFields = [
    'port',
    'externalApi.sigfoxEndpoint'
  ];

  for (const field of requiredFields) {
    const keys = field.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value[key];
      if (value === undefined || value === null) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }
}

// Validate configuration on module load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config; 