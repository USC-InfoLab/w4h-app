/**
 * Database Initialization Script
 * 
 * Run this script to set up the database schema and optionally add sample data.
 * 
 * Usage:
 *   node src/utils/initDb.js
 *   node src/utils/initDb.js --sample  (to include sample data)
 */

import { query, testConnection, closePool } from '../config/database.js';
import { initSchema, sampleData } from './schema.js';

async function initializeDatabase() {
  console.log('Initializing database...\n');

  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Run schema creation
    console.log('Creating schema...');
    await query(initSchema);
    console.log('Schema created successfully\n');

    // Check if sample data should be inserted
    const shouldInsertSample = process.argv.includes('--sample');
    
    if (shouldInsertSample) {
      console.log('Inserting sample data...');
      await query(sampleData);
      console.log('Sample data inserted successfully\n');
    }

    console.log('Database initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Start the backend server: npm run dev');
    console.log('  2. Visit http://localhost:3000/health to verify');
    console.log('  3. Explore the API at http://localhost:3000/api/v1\n');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run initialization
initializeDatabase();
