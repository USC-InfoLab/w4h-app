/**
 * Health Check Routes
 * 
 * These routes are used by load balancers and monitoring tools
 * to check if the server is healthy
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/db
 * Database health check - verifies database connection
 */
router.get('/db', asyncHandler(async (req, res) => {
  const result = await query('SELECT NOW() as time, version() as version');
  
  res.status(200).json({
    success: true,
    message: 'Database is healthy',
    timestamp: result.rows[0].time,
    version: result.rows[0].version,
  });
}));

/**
 * GET /health/detailed
 * Detailed health check with system information
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    success: true,
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    },
  });
}));

export default router;
