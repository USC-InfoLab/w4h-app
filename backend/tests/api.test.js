/**
 * Backend API Tests
 * 
 * Tests for the Express API endpoints using supertest
 */

import request from 'supertest';
import app from '../src/server.js';

describe('Health Check Endpoints', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is healthy');
  });

  test('GET /health/detailed should return system info', async () => {
    const response = await request(app).get('/health/detailed');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.server).toBeDefined();
    expect(response.body.memory).toBeDefined();
  });
});

describe('API Root', () => {
  test('GET / should return API information', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('W4H API Server');
    expect(response.body.endpoints).toBeDefined();
  });
});

describe('Dataset Endpoints', () => {
  test('GET /api/v1/datasets should return datasets list', async () => {
    const response = await request(app).get('/api/v1/datasets');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  test('GET /api/v1/datasets with pagination', async () => {
    const response = await request(app)
      .get('/api/v1/datasets')
      .query({ page: 1, limit: 5 });
    
    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(5);
  });
});

describe('Documentation Endpoints', () => {
  test('GET /api/v1/documentation should return docs list', async () => {
    const response = await request(app).get('/api/v1/documentation');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('Error Handling', () => {
  test('GET /nonexistent should return 404', async () => {
    const response = await request(app).get('/nonexistent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
