/**
 * Dataset Routes
 * 
 * Handles all dataset-related API endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as datasetController from '../controllers/datasetController.js';

const router = express.Router();

/**
 * GET /api/v1/datasets
 * Get all datasets with optional filtering and pagination
 * Query params: page, limit, type
 */
router.get('/', asyncHandler(datasetController.getAllDatasets));

/**
 * GET /api/v1/datasets/:id
 * Get a specific dataset by ID
 */
router.get('/:id', asyncHandler(datasetController.getDatasetById));

/**
 * GET /api/v1/datasets/:id/metadata
 * Get metadata for a specific dataset
 */
router.get('/:id/metadata', asyncHandler(datasetController.getDatasetMetadata));

/**
 * GET /api/v1/datasets/:id/data
 * Get data from a specific dataset with pagination
 * Query params: page, limit, startDate, endDate
 */
router.get('/:id/data', asyncHandler(datasetController.getDatasetData));

/**
 * GET /api/v1/datasets/:id/timeseries
 * Get timeseries data for visualization
 * Query params: subjects, startDate, endDate, interval
 */
router.get('/:id/timeseries', asyncHandler(datasetController.getTimeseriesData));

/**
 * POST /api/v1/datasets
 * Create a new dataset (admin only - add auth middleware later)
 */
router.post('/', asyncHandler(datasetController.createDataset));

/**
 * PUT /api/v1/datasets/:id
 * Update a dataset (admin only - add auth middleware later)
 */
router.put('/:id', asyncHandler(datasetController.updateDataset));

/**
 * DELETE /api/v1/datasets/:id
 * Delete a dataset (admin only - add auth middleware later)
 */
router.delete('/:id', asyncHandler(datasetController.deleteDataset));

export default router;
