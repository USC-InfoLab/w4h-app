/**
 * Request Logger Middleware
 * 
 * Logs HTTP requests for debugging and monitoring
 */

import morgan from 'morgan';

/**
 * Create logger based on environment
 */
export function createLogger() {
  if (process.env.NODE_ENV === 'production') {
    // In production, use 'combined' format (Apache standard)
    return morgan('combined');
  } else {
    // In development, use 'dev' format (colored, concise)
    return morgan('dev');
  }
}

/**
 * Custom request logger
 * Logs additional details about each request
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}
