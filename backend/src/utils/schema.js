/**
 * Database Schema Initialization
 * 
 * This file contains SQL to create the initial database schema.
 * Run this to set up your PostgreSQL database.
 */

export const initSchema = `
-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- e.g., 'timeseries', 'categorical', etc.
  metadata JSONB DEFAULT '{}', -- Flexible metadata storage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on dataset type for faster filtering
CREATE INDEX IF NOT EXISTS idx_datasets_type ON datasets(type);

-- Create documentation table
CREATE TABLE IF NOT EXISTS documentation (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
  content TEXT NOT NULL, -- Markdown content
  type VARCHAR(50) NOT NULL, -- 'developer', 'user', 'vendor'
  tags JSONB DEFAULT '[]', -- Array of tags for categorization
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for documentation
CREATE INDEX IF NOT EXISTS idx_documentation_type ON documentation(type);
CREATE INDEX IF NOT EXISTS idx_documentation_slug ON documentation(slug);

-- Create full-text search index for documentation
CREATE INDEX IF NOT EXISTS idx_documentation_search 
ON documentation USING gin(to_tsvector('english', title || ' ' || content));

-- Example: Create a timeseries data table (customize based on your needs)
CREATE TABLE IF NOT EXISTS timeseries_data (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for timeseries queries
CREATE INDEX IF NOT EXISTS idx_timeseries_dataset ON timeseries_data(dataset_id);
CREATE INDEX IF NOT EXISTS idx_timeseries_subject ON timeseries_data(subject_id);
CREATE INDEX IF NOT EXISTS idx_timeseries_timestamp ON timeseries_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_timeseries_dataset_subject_time 
ON timeseries_data(dataset_id, subject_id, timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE ON documentation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Sample data for testing
 */
export const sampleData = `
-- Insert sample datasets
INSERT INTO datasets (name, description, type, metadata) VALUES
  ('Heart Rate Study 2024', 'Continuous heart rate monitoring data', 'timeseries', '{"unit": "bpm", "frequency": "1min"}'),
  ('Blood Pressure Dataset', 'Systolic and diastolic readings', 'timeseries', '{"unit": "mmHg"}'),
  ('Patient Demographics', 'Demographic information', 'categorical', '{}')
ON CONFLICT DO NOTHING;

-- Insert sample documentation
INSERT INTO documentation (title, slug, content, type, tags) VALUES
  ('Getting Started', 'getting-started', '# Getting Started\n\nWelcome to the W4H system...', 'user', '["introduction", "setup"]'),
  ('API Documentation', 'api-docs', '# API Documentation\n\n## Datasets API\n\n...', 'developer', '["api", "reference"]'),
  ('Database Schema', 'database-schema', '# Database Schema\n\n## Tables\n\n...', 'developer', '["database", "schema"]')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample timeseries data
INSERT INTO timeseries_data (dataset_id, subject_id, timestamp, value) VALUES
  (1, 1, '2024-01-01 00:00:00', 72),
  (1, 1, '2024-01-01 00:01:00', 74),
  (1, 1, '2024-01-01 00:02:00', 73),
  (1, 2, '2024-01-01 00:00:00', 68),
  (1, 2, '2024-01-01 00:01:00', 69),
  (1, 2, '2024-01-01 00:02:00', 70)
ON CONFLICT DO NOTHING;
`;
