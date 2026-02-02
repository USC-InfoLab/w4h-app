/**
 * Documentation Model
 * 
 * Handles database operations for markdown documentation
 */

import { query } from '../config/database.js';

/**
 * Find all documentation pages
 */
export async function findAll({ limit = 20, offset = 0, type = null }) {
  let sql = `
    SELECT 
      id,
      title,
      slug,
      content,
      type,
      tags,
      created_at,
      updated_at
    FROM documentation
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
 * Count documentation pages
 */
export async function count({ type = null }) {
  let sql = 'SELECT COUNT(*) FROM documentation';
  const params = [];
  
  if (type) {
    sql += ' WHERE type = $1';
    params.push(type);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

/**
 * Find documentation by ID
 */
export async function findById(id) {
  const sql = `
    SELECT 
      id,
      title,
      slug,
      content,
      type,
      tags,
      created_at,
      updated_at
    FROM documentation
    WHERE id = $1
  `;

  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Find documentation by slug
 */
export async function findBySlug(slug) {
  const sql = `
    SELECT 
      id,
      title,
      slug,
      content,
      type,
      tags,
      created_at,
      updated_at
    FROM documentation
    WHERE slug = $1
  `;

  const result = await query(sql, [slug]);
  return result.rows[0];
}

/**
 * Search documentation
 * Uses PostgreSQL full-text search
 */
export async function search(searchQuery, type = null) {
  let sql = `
    SELECT 
      id,
      title,
      slug,
      type,
      tags,
      ts_rank(to_tsvector('english', title || ' ' || content), query) AS rank
    FROM documentation,
         to_tsquery('english', $1) query
    WHERE to_tsvector('english', title || ' ' || content) @@ query
  `;
  
  const params = [searchQuery.split(' ').join(' & ')];
  
  if (type) {
    sql += ' AND type = $2';
    params.push(type);
  }
  
  sql += ' ORDER BY rank DESC LIMIT 20';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Create documentation
 */
export async function create({ title, slug, content, type, tags = [] }) {
  const sql = `
    INSERT INTO documentation (title, slug, content, type, tags)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const result = await query(sql, [
    title,
    slug,
    content,
    type,
    JSON.stringify(tags),
  ]);

  return result.rows[0];
}

/**
 * Update documentation
 */
export async function update(id, { title, content, tags }) {
  const fields = [];
  const params = [];
  let paramCount = 1;

  if (title !== undefined) {
    fields.push(`title = $${paramCount++}`);
    params.push(title);
  }
  if (content !== undefined) {
    fields.push(`content = $${paramCount++}`);
    params.push(content);
  }
  if (tags !== undefined) {
    fields.push(`tags = $${paramCount++}`);
    params.push(JSON.stringify(tags));
  }

  if (fields.length === 0) {
    return await findById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `
    UPDATE documentation
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Delete documentation by ID
 */
export async function deleteById(id) {
  const sql = 'DELETE FROM documentation WHERE id = $1 RETURNING id';
  const result = await query(sql, [id]);
  return result.rows[0];
}
