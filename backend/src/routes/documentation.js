/**
 * Documentation Routes
 * 
 * Handles markdown documentation stored in the database
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as docController from '../controllers/documentationController.js';

const router = express.Router();

/**
 * GET /api/v1/documentation
 * Get all documentation pages
 * Query params: type (developer|user|vendor), page, limit
 */
router.get('/', asyncHandler(docController.getAllDocs));

/**
 * GET /api/v1/documentation/:id
 * Get a specific documentation page by ID
 */
router.get('/:id', asyncHandler(docController.getDocById));

/**
 * GET /api/v1/documentation/slug/:slug
 * Get documentation by URL slug
 */
router.get('/slug/:slug', asyncHandler(docController.getDocBySlug));

/**
 * GET /api/v1/documentation/search
 * Search documentation
 * Query params: q (query string), type
 */
router.get('/search', asyncHandler(docController.searchDocs));

/**
 * POST /api/v1/documentation
 * Create new documentation page
 */
router.post('/', asyncHandler(docController.createDoc));

/**
 * PUT /api/v1/documentation/:id
 * Update documentation page
 */
router.put('/:id', asyncHandler(docController.updateDoc));

/**
 * DELETE /api/v1/documentation/:id
 * Delete documentation page
 */
router.delete('/:id', asyncHandler(docController.deleteDoc));

export default router;
