/**
 * Documentation Controller
 * 
 * Handles markdown documentation CRUD operations
 */

import * as DocumentationModel from '../models/Documentation.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Get all documentation pages
 * GET /api/v1/documentation?type=developer&page=1&limit=20
 */
export async function getAllDocs(req, res) {
  const { page = 1, limit = 20, type } = req.query;
  
  const offset = (page - 1) * limit;
  const docs = await DocumentationModel.findAll({ limit, offset, type });
  const total = await DocumentationModel.count({ type });

  res.json({
    success: true,
    data: docs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * Get documentation by ID
 * GET /api/v1/documentation/:id
 */
export async function getDocById(req, res) {
  const { id } = req.params;
  
  const doc = await DocumentationModel.findById(id);
  
  if (!doc) {
    throw new ApiError(404, `Documentation with ID ${id} not found`);
  }

  res.json({
    success: true,
    data: doc,
  });
}

/**
 * Get documentation by slug
 * GET /api/v1/documentation/slug/getting-started
 */
export async function getDocBySlug(req, res) {
  const { slug } = req.params;
  
  const doc = await DocumentationModel.findBySlug(slug);
  
  if (!doc) {
    throw new ApiError(404, `Documentation with slug "${slug}" not found`);
  }

  res.json({
    success: true,
    data: doc,
  });
}

/**
 * Search documentation
 * GET /api/v1/documentation/search?q=database&type=developer
 */
export async function searchDocs(req, res) {
  const { q, type } = req.query;
  
  if (!q) {
    throw new ApiError(400, 'Search query (q) is required');
  }

  const results = await DocumentationModel.search(q, type);

  res.json({
    success: true,
    data: results,
    count: results.length,
  });
}

/**
 * Create documentation
 * POST /api/v1/documentation
 */
export async function createDoc(req, res) {
  const { title, slug, content, type, tags } = req.body;
  
  // Validate required fields
  if (!title || !slug || !content || !type) {
    throw new ApiError(400, 'Title, slug, content, and type are required');
  }

  // Check if slug already exists
  const existing = await DocumentationModel.findBySlug(slug);
  if (existing) {
    throw new ApiError(409, `Documentation with slug "${slug}" already exists`);
  }

  const doc = await DocumentationModel.create({
    title,
    slug,
    content,
    type,
    tags,
  });

  res.status(201).json({
    success: true,
    data: doc,
    message: 'Documentation created successfully',
  });
}

/**
 * Update documentation
 * PUT /api/v1/documentation/:id
 */
export async function updateDoc(req, res) {
  const { id } = req.params;
  const { title, content, tags } = req.body;
  
  const doc = await DocumentationModel.update(id, {
    title,
    content,
    tags,
  });

  if (!doc) {
    throw new ApiError(404, `Documentation with ID ${id} not found`);
  }

  res.json({
    success: true,
    data: doc,
    message: 'Documentation updated successfully',
  });
}

/**
 * Delete documentation
 * DELETE /api/v1/documentation/:id
 */
export async function deleteDoc(req, res) {
  const { id } = req.params;
  
  const deleted = await DocumentationModel.deleteById(id);

  if (!deleted) {
    throw new ApiError(404, `Documentation with ID ${id} not found`);
  }

  res.json({
    success: true,
    message: 'Documentation deleted successfully',
  });
}
