/**
 * @fileoverview IoT Data Decoder Routes
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import express from 'express';
import decoderController from '../controllers/decoderController.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { requestLogger } from '../middleware/requestLogger.js';

const router = express.Router();

// Apply request logging to all decoder routes
router.use(requestLogger);

/**
 * @swagger
 * components:
 *   schemas:
 *     DecodedHexData:
 *       type: object
 *       properties:
 *         device:
 *           type: string
 *           description: Device identifier
 *           example: "42A6DA"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Data collection timestamp
 *           example: "2025-06-09T03:12:25.118Z"
 *         originalHex:
 *           type: string
 *           description: Original hexadecimal data
 *           example: "0000e840cdccc7424a3e8044"
 *         decoded:
 *           type: object
 *           properties:
 *             temperature:
 *               type: number
 *               description: Temperature in Celsius
 *               example: 7.25
 *             humidity:
 *               type: number
 *               description: Humidity percentage
 *               example: 99.9
 *             pressure:
 *               type: number
 *               description: Pressure in hPa
 *               example: 1025.9465
 *         hexBytes:
 *           type: number
 *           description: Number of bytes in hex data
 *           example: 12
 *         decodingSuccess:
 *           type: boolean
 *           description: Whether decoding was successful
 *           example: true
 *     HexDecodingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Operation success status
 *           example: true
 *         message:
 *           type: string
 *           description: Response message
 *           example: "Successfully decoded 15 hex data records"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DecodedHexData'
 *         metadata:
 *           type: object
 *           properties:
 *             totalDecoded:
 *               type: number
 *               description: Total number of records decoded
 *               example: 15
 *             processingTime:
 *               type: string
 *               description: Time taken to process the request
 *               example: "245ms"
 *             decodingFormat:
 *               type: string
 *               description: Format used for decoding
 *               example: "IEEE 754 float32 little-endian"
 *             dataStructure:
 *               type: string
 *               description: Structure of the decoded data
 *               example: "temperature(4 bytes) + humidity(4 bytes) + pressure(4 bytes)"
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: Response timestamp
 *     SingleHexDecodingRequest:
 *       type: object
 *       required:
 *         - hexData
 *       properties:
 *         hexData:
 *           type: string
 *           description: Hexadecimal string to decode
 *           example: "0000e840cdccc7424a3e8044"
 *     ValidationResult:
 *       type: object
 *       properties:
 *         device:
 *           type: string
 *           description: Device identifier
 *           example: "42A6DA"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Data collection timestamp
 *         hexData:
 *           type: string
 *           description: Original hexadecimal data
 *         decoded:
 *           type: object
 *           properties:
 *             temperature:
 *               type: number
 *               description: Decoded temperature
 *             humidity:
 *               type: number
 *               description: Decoded humidity
 *             pressure:
 *               type: number
 *               description: Decoded pressure
 *         actual:
 *           type: object
 *           properties:
 *             temperature:
 *               type: number
 *               description: Actual temperature
 *             humidity:
 *               type: number
 *               description: Actual humidity
 *             pressure:
 *               type: number
 *               description: Actual pressure
 *         differences:
 *           type: object
 *           properties:
 *             temperature:
 *               type: string
 *               description: Temperature difference
 *             humidity:
 *               type: string
 *               description: Humidity difference
 *             pressure:
 *               type: string
 *               description: Pressure difference
 *         matches:
 *           type: object
 *           properties:
 *             temperature:
 *               type: boolean
 *               description: Whether temperature matches
 *             humidity:
 *               type: boolean
 *               description: Whether humidity matches
 *             pressure:
 *               type: boolean
 *               description: Whether pressure matches
 *         isAccurate:
 *           type: boolean
 *           description: Whether all values are within tolerance
 *         tolerance:
 *           type: number
 *           description: Tolerance used for comparison
 */

/**
 * @swagger
 * /api/decoder/hex-data:
 *   get:
 *     summary: Fetch and decode all hex data from external IoT API
 *     description: Retrieves data from external API and decodes all hexadecimal sensor data
 *     tags: [Decoder]
 *     responses:
 *       200:
 *         description: Successfully decoded hex data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HexDecodingResponse'
 *       502:
 *         description: Invalid API response format
 *       503:
 *         description: Unable to connect to external IoT API
 *       504:
 *         description: External API request timeout
 */
router.get('/hex-data', asyncHandler(decoderController.decodeHexData));

/**
 * @swagger
 * /api/decoder/single:
 *   post:
 *     summary: Decode a single hex string
 *     description: Decodes a single hexadecimal string into sensor values
 *     tags: [Decoder]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleHexDecodingRequest'
 *     responses:
 *       200:
 *         description: Successfully decoded hex string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DecodedHexData'
 *       400:
 *         description: Invalid hex string format
 */
router.post('/single', asyncHandler(decoderController.decodeSingleHex));

/**
 * @swagger
 * /api/decoder/validate:
 *   get:
 *     summary: Validate decoding accuracy
 *     description: Compares decoded values with actual sensor values to validate accuracy
 *     tags: [Decoder]
 *     responses:
 *       200:
 *         description: Validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 validation:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ValidationResult'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalValidations:
 *                       type: number
 *                     accurateDecodings:
 *                       type: number
 *                     accuracyRate:
 *                       type: string
 *                     processingTime:
 *                       type: string
 */
router.get('/validate', asyncHandler(decoderController.validateDecoding));

/**
 * @swagger
 * /api/decoder/info:
 *   get:
 *     summary: Get decoder information
 *     description: Returns technical information about the hex data decoder
 *     tags: [Decoder]
 *     responses:
 *       200:
 *         description: Decoder information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 info:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                     format:
 *                       type: string
 *                     dataStructure:
 *                       type: object
 *                     totalBytes:
 *                       type: number
 *                     supportedOperations:
 *                       type: array
 *                       items:
 *                         type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/info', asyncHandler(decoderController.getDecoderInfo));

export default router; 