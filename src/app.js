/**
 * @fileoverview Main application entry point for IoT Data Fusion Suite API
 * @author Gabriel Mendoza
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const dataRoutes = require('./routes/dataRoutes');
const config = require('./config/config');
const { errorHandler } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoT Data Fusion Suite API',
      version: '1.0.0',
      description: 'API for fetching and visualizing Sigfox IoT device data',
      contact: {
        name: 'Gabriel Mendoza',
        email: 'gabriel.mendoza@iot-datafusion.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        IoTData: {
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
              description: 'Data collection timestamp',
              example: '2025-06-08T20:11:32.664Z'
            },
            temperature: {
              type: 'string',
              description: 'Temperature reading in Celsius',
              example: '13.625'
            },
            humidity: {
              type: 'string',
              description: 'Humidity percentage',
              example: '99.9'
            },
            pressure: {
              type: 'string',
              description: 'Atmospheric pressure in hPa',
              example: '1025.5137'
            },
            hexData: {
              type: 'string',
              description: 'Raw hexadecimal data from device',
              example: '00005a41cdccc74270308044'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/IoTData'
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
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

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

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

module.exports = app; 