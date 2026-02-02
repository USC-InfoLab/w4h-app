/**
 * Database Configuration
 * 
 * This file handles the PostgreSQL database connection using connection pooling.
 * Connection pooling is important for performance - it reuses connections instead
 * of creating a new one for each request.
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create a connection pool
 * A pool manages multiple database connections and reuses them efficiently
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'w4h_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not available
});

/**
 * Test database connection
 * This is called on server startup to ensure database is accessible
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connected successfully at:', result.rows[0].now);
    client.release(); // Always release client back to pool
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
}

/**
 * Execute a query with parameters
 * Uses parameterized queries to prevent SQL injection
 * 
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Array of values to replace placeholders
 * @returns {Promise} Query result
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Get a client from pool for transactions
 * Use this when you need to execute multiple queries atomically
 * 
 * @returns {Promise} Database client
 */
export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout to prevent clients from being held too long
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to track query time
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  // Monkey patch release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

/**
 * Close all connections (used during server shutdown)
 */
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

export default pool;
