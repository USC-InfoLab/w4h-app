/**
 * Dataset Controller
 * 
 * Contains business logic for dataset operations.
 * Controllers handle the request/response and call models for data access.
 */

import * as DatasetModel from '../models/Dataset.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Get all datasets
 * GET /api/v1/datasets?page=1&limit=10&type=timeseries
 */
export async function getAllDatasets(req, res) {
  const { page = 1, limit = 10, type } = req.query;
  
  const offset = (page - 1) * limit;
  const datasets = await DatasetModel.findAll({ limit, offset, type });
  const total = await DatasetModel.count({ type });

  res.json({
    success: true,
    data: datasets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * Get dataset by ID
 * GET /api/v1/datasets/:id
 */
export async function getDatasetById(req, res) {
  const { id } = req.params;
  
  const dataset = await DatasetModel.findById(id);
  
  if (!dataset) {
    throw new ApiError(404, `Dataset with ID ${id} not found`);
  }

  res.json({
    success: true,
    data: dataset,
  });
}

/**
 * Get dataset metadata
 * GET /api/v1/datasets/:id/metadata
 */
export async function getDatasetMetadata(req, res) {
  const { id } = req.params;
  
  const metadata = await DatasetModel.getMetadata(id);
  
  if (!metadata) {
    throw new ApiError(404, `Dataset with ID ${id} not found`);
  }

  res.json({
    success: true,
    data: metadata,
  });
}

/**
 * Get dataset data with pagination
 * GET /api/v1/datasets/:id/data?page=1&limit=100
 */
export async function getDatasetData(req, res) {
  const { id } = req.params;
  const { page = 1, limit = 100, startDate, endDate } = req.query;
  
  const offset = (page - 1) * limit;
  
  const data = await DatasetModel.getData(id, {
    limit,
    offset,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: data.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}

/**
 * Get timeseries data for visualization
 * GET /api/v1/datasets/:id/timeseries?subjects=1,2,3&startDate=2024-01-01
 */
export async function getTimeseriesData(req, res) {
  const { id } = req.params;
  const { subjects, startDate, endDate, interval = 'day' } = req.query;
  
  // Parse subjects array
  const subjectIds = subjects ? subjects.split(',').map(Number) : [];
  
  const data = await DatasetModel.getTimeseriesData(id, {
    subjectIds,
    startDate,
    endDate,
    interval,
  });

  res.json({
    success: true,
    data,
  });
}

/**
 * Create new dataset
 * POST /api/v1/datasets
 */
export async function createDataset(req, res) {
  const { name, description, type, metadata } = req.body;
  
  // Validate required fields
  if (!name || !type) {
    throw new ApiError(400, 'Name and type are required');
  }

  const dataset = await DatasetModel.create({
    name,
    description,
    type,
    metadata,
  });

  res.status(201).json({
    success: true,
    data: dataset,
    message: 'Dataset created successfully',
  });
}

/**
 * Update dataset
 * PUT /api/v1/datasets/:id
 */
export async function updateDataset(req, res) {
  const { id } = req.params;
  const { name, description, metadata } = req.body;
  
  const dataset = await DatasetModel.update(id, {
    name,
    description,
    metadata,
  });

  if (!dataset) {
    throw new ApiError(404, `Dataset with ID ${id} not found`);
  }

  res.json({
    success: true,
    data: dataset,
    message: 'Dataset updated successfully',
  });
}

/**
 * Delete dataset
 * DELETE /api/v1/datasets/:id
 */
export async function deleteDataset(req, res) {
  const { id } = req.params;
  
  const deleted = await DatasetModel.deleteById(id);

  if (!deleted) {
    throw new ApiError(404, `Dataset with ID ${id} not found`);
  }

  res.json({
    success: true,
    message: 'Dataset deleted successfully',
  });
}
