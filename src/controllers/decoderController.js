/**
 * @fileoverview IoT Data Decoder Controller
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import decoderService from '../services/decoderService.js';
import { createApiError } from '../middleware/errorMiddleware.js';
import logger from '../utils/logger.js';

/**
 * Decoder Controller Class
 * Handles HTTP requests for IoT data decoding operations
 */
class DecoderController {
  /**
   * Decode hexadecimal data from external IoT API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async decodeHexData(req, res, next) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting hex data decoding process');
      
      const decodedData = await decoderService.fetchAndDecodeData();
      
      const duration = Date.now() - startTime;
      logger.info('Hex data decoding completed successfully', { 
        recordCount: decodedData.length,
        duration: `${duration}ms`
      });
      
      res.status(200).json({
        success: true,
        message: `Successfully decoded ${decodedData.length} hex data records`,
        data: decodedData,
        metadata: {
          totalDecoded: decodedData.length,
          processingTime: `${duration}ms`,
          decodingFormat: 'IEEE 754 float32 little-endian',
          dataStructure: 'temperature(4 bytes) + humidity(4 bytes) + pressure(4 bytes)',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in hex data decoding', { 
        error: error.message,
        duration: `${duration}ms`
      });
      
      next(error);
    }
  }

  /**
   * Decode single hex string provided in request body
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async decodeSingleHex(req, res, next) {
    const startTime = Date.now();
    
    try {
      const { hexData } = req.body;
      
      if (!hexData || typeof hexData !== 'string') {
        throw createApiError('hexData field is required and must be a string', 400);
      }
      
      logger.info('Decoding single hex string', { hexData });
      
      const decodedResult = decoderService.decodeHexString(hexData);
      
      const duration = Date.now() - startTime;
      logger.info('Single hex decoding completed', { 
        hexData,
        result: decodedResult,
        duration: `${duration}ms`
      });
      
      res.status(200).json({
        success: true,
        message: 'Hex string decoded successfully',
        input: {
          hexData,
          hexLength: hexData.length,
          expectedBytes: 12
        },
        decoded: decodedResult,
        metadata: {
          processingTime: `${duration}ms`,
          decodingFormat: 'IEEE 754 float32 little-endian',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in single hex decoding', { 
        error: error.message,
        hexData: req.body?.hexData,
        duration: `${duration}ms`
      });
      
      next(error);
    }
  }

  /**
   * Compare hex data with actual sensor values for validation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async validateDecoding(req, res, next) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting decoding validation process');
      
      const validationResults = await decoderService.validateDecodingAccuracy();
      
      const duration = Date.now() - startTime;
      logger.info('Decoding validation completed', { 
        validationCount: validationResults.length,
        duration: `${duration}ms`
      });
      
      const accurateDecodings = validationResults.filter(r => r.isAccurate);
      const accuracyRate = (accurateDecodings.length / validationResults.length) * 100;
      
      res.status(200).json({
        success: true,
        message: 'Decoding validation completed',
        validation: validationResults,
        summary: {
          totalValidations: validationResults.length,
          accurateDecodings: accurateDecodings.length,
          accuracyRate: `${accuracyRate.toFixed(2)}%`,
          processingTime: `${duration}ms`
        },
        metadata: {
          decodingFormat: 'IEEE 754 float32 little-endian',
          tolerance: 0.01,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in decoding validation', { 
        error: error.message,
        duration: `${duration}ms`
      });
      
      next(error);
    }
  }

  /**
   * Get decoder information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getDecoderInfo(req, res, next) {
    try {
      logger.info('Fetching decoder information');
      
      res.status(200).json({
        success: true,
        message: 'Decoder information retrieved successfully',
        info: {
          version: '1.0.0',
          format: 'IEEE 754 float32 little-endian',
          dataStructure: {
            temperature: '4 bytes (float32)',
            humidity: '4 bytes (float32)',
            pressure: '4 bytes (float32)'
          },
          totalBytes: 12,
          supportedOperations: [
            'Fetch and decode all hex data',
            'Decode single hex string',
            'Validate decoding accuracy'
          ],
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error fetching decoder information', { error: error.message });
      next(error);
    }
  }
}

const decoderController = new DecoderController();

export default decoderController; 