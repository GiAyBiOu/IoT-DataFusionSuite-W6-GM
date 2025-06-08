/**
 * @fileoverview Data service for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import axios from 'axios';
import config from '../config/config.js';
import { createApiError } from '../middleware/errorMiddleware.js';
import logger from '../utils/logger.js';

/**
 * In-memory cache for storing fetched data
 * In production, consider using Redis or similar caching solution
 */
const cache = {
  data: null,
  timestamp: null,
  isValid: function() {
    if (!this.data || !this.timestamp) {
      return false;
    }
    const now = new Date();
    const cacheAge = now.getTime() - this.timestamp.getTime();
    return cacheAge < config.data.cacheTimeout;
  },
  set: function(data) {
    this.data = data;
    this.timestamp = new Date();
  },
  get: function() {
    return this.isValid() ? this.data : null;
  },
  clear: function() {
    this.data = null;
    this.timestamp = null;
  }
};

/**
 * Data Service Class
 * Handles all data-related operations including external API calls
 */
class DataService {
  /**
   * Initialize the data service
   */
  constructor() {
    this.httpClient = axios.create({
      timeout: config.externalApi.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IoT-DataFusionSuite/1.0.0'
      }
    });

    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('Making external API request', { url: config.url });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('Received response from external API', { url: response.config.url });
        return response;
      },
      (error) => {
        logger.error('Response interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch data from external Sigfox API with retry mechanism
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<Array>} Array of IoT data objects
   * @throws {ApiError} When external API fails or returns invalid data
   */
  async fetchExternalData(retryCount = 0) {
    const startTime = Date.now();
    
    try {
      logger.info('Fetching data from external API', { 
        attempt: retryCount + 1, 
        endpoint: config.externalApi.sigfoxEndpoint 
      });
      
      const response = await this.httpClient.get(config.externalApi.sigfoxEndpoint);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw createApiError('Invalid data format received from external API', 502);
      }

      const duration = Date.now() - startTime;
      logger.info('Successfully fetched data from external API', { 
        recordCount: response.data.length,
        duration: `${duration}ms`
      });
      
      return response.data;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error fetching external data', { 
        attempt: retryCount + 1,
        error: error.message,
        duration: `${duration}ms`
      });

      // If we haven't exhausted retries and it's a network error, retry
      if (retryCount < config.externalApi.retries - 1 && this.isRetryableError(error)) {
        logger.info('Retrying external API request', { 
          nextAttempt: retryCount + 2,
          maxRetries: config.externalApi.retries
        });
        await this.delay(1000 * (retryCount + 1));
        return this.fetchExternalData(retryCount + 1);
      }

      if (error.response) {
        throw createApiError(
          `External API error: ${error.response.status} - ${error.response.statusText}`,
          error.response.status === 404 ? 503 : error.response.status
        );
      } else if (error.request) {
        throw createApiError('Unable to reach external API. Please try again later.', 503);
      } else {
        throw createApiError(`External API request failed: ${error.message}`, 503);
      }
    }
  }

  /**
   * Get the latest IoT data records
   * Returns cached data if available and valid, otherwise fetches fresh data
   * @returns {Promise<Array>} Array of the latest IoT data objects
   */
  async getLatestData() {
    try {
      const cachedData = cache.get();
      if (cachedData) {
        logger.debug('Returning cached data', { recordCount: cachedData.length });
        return this.processLatestRecords(cachedData);
      }

      logger.debug('Cache miss or expired, fetching fresh data');
      const allData = await this.fetchExternalData();
      
      cache.set(allData);
      
      return this.processLatestRecords(allData);

    } catch (error) {
      logger.error('Error in getLatestData', { error: error.message });
      throw error;
    }
  }

  /**
   * Process and return the latest records based on timestamp
   * @param {Array} data - Array of IoT data objects
   * @returns {Array} Array of processed latest records
   */
  processLatestRecords(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const sortedData = data
      .filter(record => record && record.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, config.data.maxRecords);

    logger.debug('Processed latest records', { 
      totalInput: data.length,
      processedOutput: sortedData.length 
    });
    
    return sortedData.map(this.normalizeDataRecord);
  }

  /**
   * Normalize a data record to ensure consistent structure
   * @param {Object} record - Raw data record
   * @returns {Object} Normalized data record
   */
  normalizeDataRecord(record) {
    return {
      device: record.device || 'unknown',
      timestamp: record.timestamp || new Date().toISOString(),
      temperature: record.temperature || null,
      humidity: record.humidity || null,
      pressure: record.pressure || null,
      hexData: record.hexData || null,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Process data for visualization
   * Formats data specifically for visualization applications
   * @param {Array} data - Array of IoT data objects
   * @returns {Object} Formatted visualization data
   */
  processVisualizationData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        message: 'No data available for visualization',
        data: [],
        timestamp: new Date().toISOString()
      };
    }

    const processedData = data.map(record => ({
      deviceId: record.device,
      timestamp: record.timestamp,
      sensors: {
        temperature: {
          value: parseFloat(record.temperature) || 0,
          unit: '°C'
        },
        humidity: {
          value: parseFloat(record.humidity) || 0,
          unit: '%'
        },
        pressure: {
          value: parseFloat(record.pressure) || 0,
          unit: 'hPa'
        }
      },
      rawData: record.hexData,
      quality: this.assessDataQuality(record)
    }));

    return {
      success: true,
      message: 'Data processed successfully for visualization',
      data: processedData,
      summary: {
        totalRecords: processedData.length,
        latestTimestamp: processedData[0]?.timestamp,
        devices: [...new Set(processedData.map(r => r.deviceId))]
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assess data quality of a record
   * @param {Object} record - Data record to assess
   * @returns {string} Quality assessment (excellent, good, fair, poor)
   */
  assessDataQuality(record) {
    let score = 0;
    
    if (record.temperature) score++;
    if (record.humidity) score++;
    if (record.pressure) score++;
    if (record.hexData) score++;
    if (record.timestamp && new Date(record.timestamp).getTime() > 0) score++;

    if (score >= 4) return 'excellent';
    if (score >= 3) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    return !error.response || 
           error.code === 'ECONNABORTED' || 
           error.code === 'ETIMEDOUT' ||
           (error.response.status >= 500);
  }

  /**
   * Delay execution for the specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cached data
   * Useful for testing or when fresh data is explicitly required
   */
  clearCache() {
    cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      hasData: !!cache.data,
      timestamp: cache.timestamp,
      isValid: cache.isValid(),
      recordCount: cache.data ? cache.data.length : 0
    };
  }
}

const dataService = new DataService();

export default dataService; 