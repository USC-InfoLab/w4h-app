/**
 * Dataset Model
 * 
 * This model handles all database operations for datasets.
 * It provides a clean interface between controllers and the database.
 */

import { query } from '../config/database.js';

/**
 * Find all datasets with optional filtering
 */
export async function findAll({ limit = 10, offset = 0, type = null }) {
  let sql = `
    SELECT 
      id,
      name,
      description,
      type,
      metadata,
      created_at,
      updated_at
    FROM datasets
  `;
  
  const params = [];
  
  if (type) {
    sql += ' WHERE type = $1';
    params.push(type);
    sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);
  } else {
    sql += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Count datasets with optional filtering
 */
export async function count({ type = null }) {
  let sql = 'SELECT COUNT(*) FROM datasets';
  const params = [];
  
  if (type) {
    sql += ' WHERE type = $1';
    params.push(type);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

/**
 * Find dataset by ID
 */
export async function findById(id) {
  const sql = `
    SELECT 
      id,
      name,
      description,
      type,
      metadata,
      created_at,
      updated_at
    FROM datasets
    WHERE id = $1
  `;

  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Get dataset metadata
 */
export async function getMetadata(id) {
  const sql = `
    SELECT 
      id,
      name,
      type,
      metadata,
      created_at,
      updated_at
    FROM datasets
    WHERE id = $1
  `;

  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Get dataset data (placeholder - actual implementation depends on your schema)
 * This is a generic example - customize based on your data structure
 */
export async function getData(datasetId, { limit, offset, startDate, endDate }) {
  // This is a placeholder. In reality, you'd query the specific table
  // associated with this dataset, using the dataset metadata
  
  const dataset = await findById(datasetId);
  if (!dataset) return { rows: [] };

  // Example: If datasets have a 'table_name' in metadata
  // const tableName = dataset.metadata?.table_name;
  
  // For now, return empty data
  // TODO: Implement actual data retrieval based on dataset structure
  return { rows: [] };
}

/**
 * Get timeseries data for subjects
 */
export async function getTimeseriesData(datasetId, { subjectIds, startDate, endDate, interval }) {
  // Placeholder for timeseries data retrieval
  // This would query your actual timeseries tables
  
  // TODO: Implement based on your timeseries schema
  return {
    datasetId,
    subjects: subjectIds,
    interval,
    data: [],
  };
}

/**
 * Create new dataset
 */
export async function create({ name, description, type, metadata = {} }) {
  const sql = `
    INSERT INTO datasets (name, description, type, metadata)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const result = await query(sql, [
    name,
    description,
    type,
    JSON.stringify(metadata),
  ]);

  return result.rows[0];
}

/**
 * Update dataset
 */
export async function update(id, { name, description, metadata }) {
  const fields = [];
  const params = [];
  let paramCount = 1;

  if (name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    params.push(name);
  }
  if (description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    params.push(description);
  }
  if (metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    params.push(JSON.stringify(metadata));
  }

  if (fields.length === 0) {
    return await findById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `
    UPDATE datasets
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Delete dataset by ID
 */
export async function deleteById(id) {
  const sql = 'DELETE FROM datasets WHERE id = $1 RETURNING id';
  const result = await query(sql, [id]);
  return result.rows[0];
}
