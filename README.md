# IoT Data Fusion Suite API

**Author: Gabriel Mendoza**

A comprehensive IoT data management REST API designed for fetching, processing, and visualizing data from Sigfox IoT devices. This enterprise-grade API serves as a bridge between external Sigfox data sources and visualization applications, providing reliable data aggregation, intelligent caching, and structured data transformation capabilities.

## Project Overview

This IoT Data Fusion Suite is a professional-grade Node.js application that demonstrates modern API development practices including:

- **3-Layer Architecture**: Clean separation of concerns with routes, controllers, and services
- **Real-time Data Processing**: Fetches and processes live IoT sensor data
- **Intelligent Caching**: Optimized data retrieval with configurable cache management
- **Comprehensive Documentation**: Interactive Swagger/OpenAPI documentation
- **Production-Ready Features**: Security headers, rate limiting, error handling, and logging
- **Visualization Support**: Specialized endpoints for data visualization applications

The API specifically targets Sigfox IoT devices and provides standardized endpoints for retrieving environmental sensor data including temperature, humidity, and atmospheric pressure readings.

## Quick Start

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GiAyBiOu/IoT-DataFusionSuite-W6-GM.git
cd IoT-DataFusionSuite-W6-GM
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Or start in production mode**
```bash
npm start
```

The API will be available at: `http://localhost:3000`

## API Documentation

Once the server is running, access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## API Endpoints

### GET `/api/data`
Fetches the 2 most recent IoT data records from the external Sigfox API.

**Response Example:**
```json
{
  "success": true,
  "message": "Successfully retrieved 2 latest IoT records",
  "data": [
    {
      "device": "42A6DA",
      "timestamp": "2025-06-08T20:56:30.297Z",
      "temperature": "12.9375",
      "humidity": "99.9",
      "pressure": "1025.5876",
      "hexData": null,
      "processedAt": "2025-01-14T10:30:00.000Z"
    }
  ],
  "metadata": {
    "totalRecords": 2,
    "source": "Sigfox IoT Device",
    "apiVersion": "1.0.0",
    "timestamp": "2025-01-14T10:30:00.000Z"
  }
}
```

### POST `/api/visualize`
Processes IoT data for visualization applications.

**Request Body:**
```json
{
  "data": [
    {
      "device": "42A6DA",
      "timestamp": "2025-06-08T20:56:30.297Z",
      "temperature": "12.9375",
      "humidity": "99.9",
      "pressure": "1025.5876"
    }
  ],
  "source": "node-red",
  "options": {
    "format": "gauge"
  }
}
```

### GET `/api/status`
Returns comprehensive system status and health information.

### POST `/api/cache/clear`
Clears the internal data cache, forcing fresh data retrieval on the next request.

## Architecture

This API follows a clean 3-layer architecture:

```
src/
├── app.js              # Application entry point
├── config/
│   └── config.js       # Configuration management
├── controllers/        # Request/Response handling
│   └── dataController.js
├── services/          # Business logic
│   └── dataService.js
├── middleware/        # Custom middleware
│   └── errorMiddleware.js
└── routes/           # API routing
    └── dataRoutes.js
```

### Layer Responsibilities

1. **Routes Layer** (`routes/`): Defines API endpoints and Swagger documentation
2. **Controller Layer** (`controllers/`): Handles HTTP requests and responses
3. **Service Layer** (`services/`): Contains business logic and external API integration

## Configuration

The API can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `LOG_LEVEL`: Logging level (info/debug/error)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Structured error responses

## Caching Strategy

The API implements intelligent caching:
- **Cache Duration**: 30 seconds
- **Cache Strategy**: In-memory (suitable for development)
- **Cache Management**: Automatic expiration and manual clearing

## Testing the API

### Using curl

**Get latest data:**
```bash
curl -X GET http://localhost:3000/api/data
```

**Send data for visualization:**
```bash
curl -X POST http://localhost:3000/api/visualize \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "device": "42A6DA",
        "timestamp": "2025-06-08T20:56:30.297Z",
        "temperature": "12.9375",
        "humidity": "99.9",
        "pressure": "1025.5876"
      }
    ]
  }'
```

**Check system status:**
```bash
curl -X GET http://localhost:3000/api/status
```

## Monitoring

The API provides several monitoring endpoints:
- `/health` - Basic health check
- `/api/status` - Comprehensive system status
- Built-in structured logging with multiple levels

## Deployment

For production deployment:

1. Set environment variables appropriately
2. Use `npm start` instead of `npm run dev`
3. Consider using a process manager like PM2
4. Set up proper logging and monitoring

## External Dependencies

- **External API**: `https://callback-iot.onrender.com/data`
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout**: 10 seconds per request