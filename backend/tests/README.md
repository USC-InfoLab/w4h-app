# Backend Tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `api.test.js` - API endpoint tests

## Writing Tests

Use Jest and Supertest for API testing:

```javascript
import request from 'supertest';
import app from '../src/server.js';

test('GET /api/v1/endpoint', async () => {
  const response = await request(app).get('/api/v1/endpoint');
  expect(response.status).toBe(200);
});
```
