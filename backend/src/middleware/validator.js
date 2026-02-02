/**
 * Validation Middleware
 * 
 * Uses express-validator to validate request data
 */

import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

/**
 * Middleware to check validation results
 * Call this after validation rules
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, 'Validation failed', true, errorMessages);
  }
  
  next();
}

/**
 * Common validation rules
 */
export const validationRules = {
  // Validate pagination parameters
  pagination: {
    page: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1 },
        errorMessage: 'Page must be a positive integer',
      },
      toInt: true,
    },
    limit: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: 'Limit must be between 1 and 100',
      },
      toInt: true,
    },
  },

  // Validate ID parameter
  id: {
    in: ['params'],
    isInt: {
      errorMessage: 'ID must be an integer',
    },
    toInt: true,
  },

  // Validate UUID parameter
  uuid: {
    in: ['params'],
    isUUID: {
      errorMessage: 'Invalid UUID format',
    },
  },
};
