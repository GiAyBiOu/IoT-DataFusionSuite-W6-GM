/**
 * @fileoverview Data controller for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

const dataService = require('../services/dataService');
const { asyncHandler, createApiError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

/**
 * Data Controller Class
 * Handles HTTP requests and responses for IoT data endpoints
 */
class DataController {
  
  /**
   * Get latest IoT data from external API
   * Returns the 2 most recent records from the Sigfox device
   * 
   * @route GET /api/data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with latest IoT data
   */
  getLatestData = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    logger.info('Processing GET /data request');
    
    try {
      const latestRecords = await dataService.getLatestData();
      
      const response = {
        success: true,
        message: `Successfully retrieved ${latestRecords.length} latest IoT records`,
        data: latestRecords,
        metadata: {
          totalRecords: latestRecords.length,
          source: 'Sigfox IoT Device',
          apiVersion: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };

      const cacheStats = dataService.getCacheStats();
      if (cacheStats.hasData) {
        response.metadata.cache = {
          used: cacheStats.isValid,
          lastUpdated: cacheStats.timestamp
        };
      }

      const duration = Date.now() - startTime;
      logger.info('Successfully processed GET /data request', {
        recordCount: latestRecords.length,
        duration: `${duration}ms`
      });
      
      res.status(200).json(response);
      
    } catch (error) {
      logger.error('Error in getLatestData controller', { error: error.message });
      throw error; // Let error middleware handle it
    }
  });

  /**
   * Process and send data for visualization
   * Accepts IoT data and formats it for visualization applications
   * 
   * @route POST /api/visualize
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with processed visualization data
   */
  processVisualizationData = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    logger.info('Processing POST /visualize request');
    
    try {
      const { data: inputData, source = 'client', options = {} } = req.body;
      
      if (!inputData) {
        throw createApiError('Data field is required in request body', 400);
      }

      if (!Array.isArray(inputData)) {
        throw createApiError('Data must be an array of IoT records', 400);
      }

      if (inputData.length === 0) {
        throw createApiError('Data array cannot be empty', 400);
      }

      logger.info('Processing records for visualization', { 
        recordCount: inputData.length,
        source: source 
      });

      this.validateDataRecords(inputData);

      const visualizationData = dataService.processVisualizationData(inputData);

      const response = {
        ...visualizationData,
        metadata: {
          source: source,
          inputRecords: inputData.length,
          outputRecords: visualizationData.data.length,
          processingOptions: options,
          apiVersion: '1.0.0',
          processedAt: new Date().toISOString()
        }
      };

      const duration = Date.now() - startTime;
      logger.info('Successfully processed visualization data', {
        inputRecords: inputData.length,
        outputRecords: visualizationData.data.length,
        duration: `${duration}ms`
      });
      
      res.status(200).json(response);
      
    } catch (error) {
      logger.error('Error in processVisualizationData controller', { error: error.message });
      throw error;
    }
  });

  /**
   * Get system health and status information
   * Provides information about API status, cache, and external API connectivity
   * 
   * @route GET /api/status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with system status
   */
  getSystemStatus = asyncHandler(async (req, res) => {
    logger.info('Processing GET /status request');
    
    try {
      const cacheStats = dataService.getCacheStats();
      
      let externalApiStatus = 'unknown';
      let externalApiLatency = null;
      
      try {
        const startTime = Date.now();
        await dataService.fetchExternalData();
        externalApiLatency = Date.now() - startTime;
        externalApiStatus = 'healthy';
      } catch (error) {
        externalApiStatus = 'unhealthy';
        logger.warn('External API health check failed', { error: error.message });
      }

      const response = {
        success: true,
        message: 'System status retrieved successfully',
        status: {
          api: {
            status: 'healthy',
            version: '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
          },
          cache: {
            hasData: cacheStats.hasData,
            isValid: cacheStats.isValid,
            recordCount: cacheStats.recordCount,
            lastUpdated: cacheStats.timestamp
          },
          externalApi: {
            status: externalApiStatus,
            latency: externalApiLatency,
            endpoint: 'https://callback-iot.onrender.com/data'
          },
          system: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
          }
        }
      };

      logger.info('System status retrieved successfully');
      
      res.status(200).json(response);
      
    } catch (error) {
      logger.error('Error in getSystemStatus controller', { error: error.message });
      throw error;
    }
  });

  /**
   * Clear cached data
   * Forces refresh of cached data on next request
   * 
   * @route POST /api/cache/clear
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response confirming cache clear
   */
  clearCache = asyncHandler(async (req, res) => {
    logger.info('Processing POST /cache/clear request');
    
    try {
      // Clear the cache
      dataService.clearCache();
      
      const response = {
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      };

      logger.info('Cache cleared successfully');
      
      res.status(200).json(response);
      
    } catch (error) {
      logger.error('Error in clearCache controller', { error: error.message });
      throw error;
    }
  });

  /**
   * Validate structure of IoT data records
   * @param {Array} records - Array of data records to validate
   * @throws {ApiError} When validation fails
   */
  validateDataRecords(records) {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      if (!record || typeof record !== 'object') {
        throw createApiError(`Invalid record at index ${i}: must be an object`, 400);
      }

      const hasValidField = record.device || 
                           record.timestamp || 
                           record.temperature || 
                           record.humidity || 
                           record.pressure || 
                           record.hexData;

      if (!hasValidField) {
        throw createApiError(
          `Invalid record at index ${i}: must contain at least one of: device, timestamp, temperature, humidity, pressure, hexData`, 
          400
        );
      }

      if (record.timestamp) {
        const date = new Date(record.timestamp);
        if (isNaN(date.getTime())) {
          throw createApiError(`Invalid timestamp format at record index ${i}`, 400);
        }
      }

      if (record.temperature && isNaN(parseFloat(record.temperature))) {
        throw createApiError(`Invalid temperature value at record index ${i}`, 400);
      }

      if (record.humidity && isNaN(parseFloat(record.humidity))) {
        throw createApiError(`Invalid humidity value at record index ${i}`, 400);
      }

      if (record.pressure && isNaN(parseFloat(record.pressure))) {
        throw createApiError(`Invalid pressure value at record index ${i}`, 400);
      }
    }
  }

  /**
   * Handle requests for endpoints that don't exist in this controller
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handleNotFound = (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
      availableEndpoints: [
        'GET /api/data - Get latest IoT data',
        'POST /api/visualize - Process data for visualization',
        'GET /api/status - Get system status',
        'POST /api/cache/clear - Clear cached data'
      ],
      timestamp: new Date().toISOString()
    });
  };
}

const dataController = new DataController();

module.exports = dataController; 