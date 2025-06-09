/**
 * @fileoverview IoT Hex Data Decoder Service
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import axios from 'axios';
import { createApiError } from '../middleware/errorMiddleware.js';
import logger from '../utils/logger.js';

/**
 * IoT Data Decoder Service Class
 * Handles decoding of hexadecimal sensor data to readable values
 */
class DecoderService {
  constructor() {
    this.apiUrl = 'https://callback-iot.onrender.com/data';
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Fetch data from external API and decode hex values
   * @returns {Promise<Array>} Array of decoded sensor data
   */
  async fetchAndDecodeData() {
    try {
      logger.info('Fetching data from external IoT API', { url: this.apiUrl });
      
      const response = await axios.get(this.apiUrl, { 
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IoT-DataFusionSuite-Decoder/1.0.0'
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw createApiError('Invalid API response format', 502);
      }

      logger.info('External API response received', { 
        statusCode: response.status,
        recordCount: response.data.length 
      });

      // Filter only records with hexData field
      const hexDataRecords = response.data.filter(record => record.hexData);
      
      if (hexDataRecords.length === 0) {
        logger.warn('No hex data records found in API response');
        return [];
      }

      logger.info('Processing hex data records', { 
        hexRecordsFound: hexDataRecords.length 
      });

      // Decode each hex data record
      const decodedData = hexDataRecords.map(record => {
        try {
          const decoded = this.decodeHexString(record.hexData);
          return {
            device: record.device,
            timestamp: record.timestamp,
            originalHex: record.hexData,
            decoded: {
              temperature: decoded.temperature,
              humidity: decoded.humidity,
              pressure: decoded.pressure
            },
            hexBytes: record.hexData.length / 2,
            decodingSuccess: true
          };
        } catch (error) {
          logger.error('Failed to decode hex data', { 
            device: record.device,
            hexData: record.hexData,
            error: error.message 
          });
          
          return {
            device: record.device,
            timestamp: record.timestamp,
            originalHex: record.hexData,
            decoded: null,
            decodingSuccess: false,
            error: error.message
          };
        }
      });

      const successfulDecodings = decodedData.filter(d => d.decodingSuccess);
      logger.info('Hex data decoding completed', { 
        totalRecords: decodedData.length,
        successfulDecodings: successfulDecodings.length,
        failedDecodings: decodedData.length - successfulDecodings.length
      });

      return decodedData;

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('Network error accessing external API', { 
          url: this.apiUrl,
          error: error.message 
        });
        throw createApiError('Unable to connect to external IoT API', 503);
      }
      
      if (error.code === 'ECONNABORTED') {
        logger.error('API request timeout', { 
          url: this.apiUrl,
          timeout: this.timeout 
        });
        throw createApiError('External API request timeout', 504);
      }

      logger.error('Error fetching and decoding data', { error: error.message });
      throw error;
    }
  }

  /**
   * Decode a single hex string to sensor values
   * @param {string} hexString - Hexadecimal string to decode
   * @returns {Object} Decoded sensor values
   */
  decodeHexString(hexString) {
    if (!hexString || typeof hexString !== 'string') {
      throw createApiError('Invalid hex string provided', 400);
    }

    // Remove any whitespace and validate hex format
    const cleanHex = hexString.replace(/\s/g, '');
    
    if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
      throw createApiError('Invalid hexadecimal format', 400);
    }

    // Each float32 requires 4 bytes (8 hex characters)
    // Expected: temperature(4) + humidity(4) + pressure(4) = 12 bytes = 24 hex chars
    if (cleanHex.length !== 24) {
      throw createApiError(
        `Invalid hex data length. Expected 24 characters (12 bytes), got ${cleanHex.length}`, 
        400
      );
    }

    try {
      // Convert hex string to Buffer
      const buffer = Buffer.from(cleanHex, 'hex');
      
      logger.debug('Decoding hex data', { 
        originalHex: hexString,
        cleanHex: cleanHex,
        bufferLength: buffer.length 
      });

      // Read three 32-bit little-endian floats
      // Bytes 0-3: Temperature
      // Bytes 4-7: Humidity  
      // Bytes 8-11: Pressure
      const temperature = buffer.readFloatLE(0);
      const humidity = buffer.readFloatLE(4);
      const pressure = buffer.readFloatLE(8);

      // Validate decoded values are reasonable for sensor data
      this.validateSensorValues(temperature, humidity, pressure);

      const result = {
        temperature: parseFloat(temperature.toFixed(4)),
        humidity: parseFloat(humidity.toFixed(4)),
        pressure: parseFloat(pressure.toFixed(4))
      };

      logger.debug('Hex decoding successful', { 
        hexData: cleanHex,
        decoded: result 
      });

      return result;

    } catch (error) {
      logger.error('Error in hex string decoding', { 
        hexString: cleanHex,
        error: error.message 
      });
      
      if (error.message.includes('Invalid sensor values')) {
        throw error;
      }
      
      throw createApiError(`Failed to decode hex data: ${error.message}`, 400);
    }
  }

  /**
   * Validate that decoded sensor values are within reasonable ranges
   * @param {number} temperature - Temperature value in Celsius
   * @param {number} humidity - Humidity percentage  
   * @param {number} pressure - Pressure in hPa
   */
  validateSensorValues(temperature, humidity, pressure) {
    const validationErrors = [];

    // Temperature validation (-50°C to +85°C typical sensor range)
    if (isNaN(temperature) || temperature < -50 || temperature > 85) {
      validationErrors.push(`Invalid temperature: ${temperature}°C`);
    }

    // Humidity validation (0% to 100%)
    if (isNaN(humidity) || humidity < 0 || humidity > 100) {
      validationErrors.push(`Invalid humidity: ${humidity}%`);
    }

    // Pressure validation (300 to 1200 hPa typical range)
    if (isNaN(pressure) || pressure < 300 || pressure > 1200) {
      validationErrors.push(`Invalid pressure: ${pressure} hPa`);
    }

    if (validationErrors.length > 0) {
      throw createApiError(
        `Invalid sensor values detected: ${validationErrors.join(', ')}`, 
        400
      );
    }
  }

  /**
   * Validate decoding accuracy by comparing with actual sensor values
   * @returns {Promise<Array>} Validation results
   */
  async validateDecodingAccuracy() {
    try {
      logger.info('Starting decoding accuracy validation');
      
      const response = await axios.get(this.apiUrl, { timeout: this.timeout });
      const allData = response.data;

      // Find records that have both hexData and actual sensor values
      const validationPairs = [];
      
      for (const record of allData) {
        if (record.hexData) {
          // Look for a corresponding record with actual values
          const actualRecord = allData.find(r => 
            r.device === record.device &&
            r.temperature !== undefined &&
            r.humidity !== undefined &&
            r.pressure !== undefined &&
            Math.abs(new Date(r.timestamp).getTime() - new Date(record.timestamp).getTime()) < 5000 // Within 5 seconds
          );

          if (actualRecord) {
            validationPairs.push({
              hexRecord: record,
              actualRecord: actualRecord
            });
          }
        }
      }

      logger.info('Found validation pairs', { count: validationPairs.length });

      const validationResults = validationPairs.map(pair => {
        try {
          const decoded = this.decodeHexString(pair.hexRecord.hexData);
          const actual = {
            temperature: parseFloat(pair.actualRecord.temperature),
            humidity: parseFloat(pair.actualRecord.humidity),
            pressure: parseFloat(pair.actualRecord.pressure)
          };

          // Check accuracy with tolerance
          const tolerance = 0.01; // 1% tolerance
          const tempMatch = Math.abs(decoded.temperature - actual.temperature) <= tolerance;
          const humidityMatch = Math.abs(decoded.humidity - actual.humidity) <= tolerance;
          const pressureMatch = Math.abs(decoded.pressure - actual.pressure) <= tolerance;

          const isAccurate = tempMatch && humidityMatch && pressureMatch;

          return {
            device: pair.hexRecord.device,
            timestamp: pair.hexRecord.timestamp,
            hexData: pair.hexRecord.hexData,
            decoded: decoded,
            actual: actual,
            differences: {
              temperature: (decoded.temperature - actual.temperature).toFixed(4),
              humidity: (decoded.humidity - actual.humidity).toFixed(4),
              pressure: (decoded.pressure - actual.pressure).toFixed(4)
            },
            matches: {
              temperature: tempMatch,
              humidity: humidityMatch,
              pressure: pressureMatch
            },
            isAccurate: isAccurate,
            tolerance: tolerance
          };
        } catch (error) {
          return {
            device: pair.hexRecord.device,
            timestamp: pair.hexRecord.timestamp,
            hexData: pair.hexRecord.hexData,
            error: error.message,
            isAccurate: false
          };
        }
      });

      logger.info('Validation completed', { 
        totalValidations: validationResults.length,
        accurateCount: validationResults.filter(r => r.isAccurate).length
      });

      return validationResults;

    } catch (error) {
      logger.error('Error in decoding validation', { error: error.message });
      throw error;
    }
  }
}

const decoderService = new DecoderService();

export default decoderService; 