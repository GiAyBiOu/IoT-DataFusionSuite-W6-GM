/**
 * @fileoverview Data routes for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import express from 'express';
import dataController from '../controllers/dataController.js';

const router = express.Router();

/**
 * @swagger
 * /api/data:
 *   get:
 *     summary: Get latest IoT data records
 *     description: Fetches the 2 most recent IoT data records from the external Sigfox API
 *     tags: [IoT Data]
 *     responses:
 *       200:
 *         description: Successfully retrieved latest IoT data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       503:
 *         description: External API unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/data', dataController.getLatestData);

/**
 * @swagger
 * /api/visualize:
 *   post:
 *     summary: Process IoT data for visualization
 *     description: Accepts IoT data and processes it for visualization applications
 *     tags: [Data Visualization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/IoTData'
 *               source:
 *                 type: string
 *                 default: "client"
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data processed successfully for visualization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/visualize', dataController.processVisualizationData);

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get system health and status
 *     description: Returns system status including API health and external API connectivity
 *     tags: [System Status]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 */
router.get('/status', dataController.getSystemStatus);

/**
 * @swagger
 * /api/cache/clear:
 *   post:
 *     summary: Clear cached data
 *     description: Forces the API to clear its internal data cache
 *     tags: [Cache Management]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear', dataController.clearCache);

router.use('*', dataController.handleNotFound);

export default router; 