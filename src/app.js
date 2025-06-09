/**
 * @fileoverview Main application entry point for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import dataRoutes from './routes/dataRoutes.js';
import decoderRoutes from './routes/decoderRoutes.js';
import config from './config/config.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import logger from './utils/logger.js';

/**
 * Initialize Express application
 */
const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoT Data Fusion Suite API',
      version: '1.0.0',
      description: 'API for fetching and visualizing Sigfox IoT device data',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Decoder',
        description: 'Endpoints for decoding hex data from IoT devices'
      },
      {
        name: 'Data',
        description: 'Endpoints for managing IoT data'
      }
    ],
    components: {
      schemas: {
        DecodedHexData: {
          type: 'object',
          properties: {
            device: {
              type: 'string',
              description: 'Device identifier',
              example: '42A6DA'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Data collection timestamp'
            },
            originalHex: {
              type: 'string',
              description: 'Original hexadecimal data',
              example: '0000e840cdccc7424a3e8044'
            },
            decoded: {
              type: 'object',
              properties: {
                temperature: {
                  type: 'number',
                  description: 'Temperature in Celsius',
                  example: 7.25
                },
                humidity: {
                  type: 'number',
                  description: 'Humidity percentage',
                  example: 99.9
                },
                pressure: {
                  type: 'number',
                  description: 'Pressure in hPa',
                  example: 1025.9465
                }
              }
            },
            hexBytes: {
              type: 'number',
              description: 'Number of bytes in hex data',
              example: 12
            },
            decodingSuccess: {
              type: 'boolean',
              description: 'Whether decoding was successful',
              example: true
            }
          }
        },
        SingleHexDecodingRequest: {
          type: 'object',
          required: ['hexData'],
          properties: {
            hexData: {
              type: 'string',
              description: 'Hexadecimal string to decode',
              example: '0000e840cdccc7424a3e8044'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'IoT Data Fusion API Documentation'
}));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IoT Data Fusion Suite API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api', dataRoutes);
logger.info('Data routes registered at /api');

app.use('/api/decoder', decoderRoutes);
logger.info('Decoder routes registered at /api/decoder');

app.use(errorHandler);

/**
 * Start the server
 */
const server = app.listen(config.port, () => {
  logger.info(`IoT Data Fusion Suite API is running on port ${config.port}`);
  logger.info(`API Documentation available at: http://localhost:${config.port}/api-docs`);
  logger.info(`Health check available at: http://localhost:${config.port}/health`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app; 