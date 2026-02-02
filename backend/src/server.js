/**
 * W4H Express Server
 * 
 * This is the main entry point for the backend API server.
 * It sets up Express with all middleware, routes, and error handling.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import configuration and middleware
import { testConnection, closePool } from './config/database.js';
import { createLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import healthRoutes from './routes/health.js';
import datasetRoutes from './routes/datasets.js';
import documentationRoutes from './routes/documentation.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

/**
 * Security Middleware
 */

// Helmet helps secure Express apps by setting HTTP headers
app.use(helmet());

// CORS - Allow frontend to make requests to backend
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(API_PREFIX, limiter);

/**
 * General Middleware
 */

// Compression middleware - compress response bodies
app.use(compression());

// Body parsing middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging middleware
app.use(createLogger());

/**
 * Routes
 */

// Health check route (not behind API prefix for load balancers)
app.use('/health', healthRoutes);

// API routes (all behind /api/v1 prefix)
app.use(`${API_PREFIX}/datasets`, datasetRoutes);
app.use(`${API_PREFIX}/documentation`, documentationRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'W4H API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: API_PREFIX,
      datasets: `${API_PREFIX}/datasets`,
      documentation: `${API_PREFIX}/documentation`,
    },
  });
});

/**
 * Error Handling
 * These must be after all routes
 */

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Server Startup
 */

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected && process.env.NODE_ENV !== 'development') {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   W4H Backend Server                   ║
╠════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Port: ${PORT}
║   API Prefix: ${API_PREFIX}
║   Database: ${dbConnected ? 'Connected' : 'Not Connected'}
╚════════════════════════════════════════╝

Server is running at http://localhost:${PORT}
API available at http://localhost:${PORT}${API_PREFIX}
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export app for testing
export default app;
