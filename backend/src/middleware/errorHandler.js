/**
 * Error Handler Middleware
 * 
 * This is Express middleware that catches and handles errors.
 * It should be the LAST middleware added to the app.
 */

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Whether this is a known/expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches all errors and sends appropriate response
 */
export function errorHandler(err, req, res, next) {
  let { statusCode = 500, message } = err;

  // Log error details
  console.error('Error occurred:', {
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // In production, don't leak error details
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler
 * This catches requests to routes that don't exist
 */
export function notFoundHandler(req, res, next) {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors automatically
 * 
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
