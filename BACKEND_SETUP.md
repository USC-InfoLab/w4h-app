# Express Backend Setup - Learning Guide

This document explains how the Express backend was built from scratch, the concepts behind each component, and why certain decisions were made. Use this as a learning resource to understand backend development with Node.js and Express.

##  Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Concepts](#core-concepts)
4. [Step-by-Step Build Process](#step-by-step-build-process)
5. [Key Components Explained](#key-components-explained)
6. [Database Design](#database-design)
7. [Security Best Practices](#security-best-practices)
8. [Testing Strategy](#testing-strategy)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

## Overview

### What is Express?

Express is a minimal and flexible Node.js web framework that provides features for building web and mobile applications. It's the de facto standard for building REST APIs in Node.js.

### Why Express?

- **Simple & Unopinionated**: Gives you flexibility in how you structure your app
- **Robust Routing**: Easy to define routes and handle HTTP methods
- **Middleware**: Powerful system for processing requests
- **Large Ecosystem**: Thousands of middleware packages available
- **Performance**: Fast and lightweight

### Project Goals

Our backend serves several purposes:
1. **API Server**: Provides REST API endpoints for the frontend
2. **Database Interface**: Handles all database operations
3. **Business Logic**: Processes and validates data
4. **Security**: Protects against common vulnerabilities

## Project Structure

### Why This Structure?

```
backend/
├── src/                    # Source code
│   ├── server.js          # Entry point - starts the server
│   ├── config/            # Configuration files
│   ├── routes/            # API route definitions
│   ├── controllers/       # Request handlers
│   ├── models/            # Database operations
│   ├── middleware/        # Request processing functions
│   └── utils/             # Helper functions
├── tests/                 # Test files
├── .env.example          # Environment variable template
└── package.json          # Dependencies and scripts
```

**Reasoning**:
- **Separation of Concerns**: Each folder has a specific responsibility
- **Scalability**: Easy to add new features without affecting existing code
- **Maintainability**: Easy to find and modify specific functionality
- **Testability**: Clean structure makes testing easier

### MVC Pattern

We use the **Model-View-Controller** pattern (without views, since frontend handles that):

```
Request → Route → Controller → Model → Database
                     ↓
                  Response
```

**Flow**:
1. **Route**: Receives HTTP request, calls controller
2. **Controller**: Processes request, calls model
3. **Model**: Interacts with database
4. **Controller**: Formats and sends response

## Core Concepts

### 1. Middleware

Middleware are functions that process requests before they reach your route handlers.

**How it works**:
```javascript
app.use((req, res, next) => {
  // Do something with request
  next(); // Pass to next middleware
});
```

**Common middleware**:
- **Body Parser**: Parses request body (JSON, form data)
- **CORS**: Handles cross-origin requests
- **Helmet**: Sets security headers
- **Morgan**: Logs HTTP requests
- **Error Handler**: Catches and formats errors

**Order matters!** Middleware executes in the order you add it.

### 2. Routing

Routes define how your app responds to client requests.

```javascript
router.get('/api/datasets', controller.getAllDatasets);
```

**HTTP Methods**:
- `GET` - Retrieve data
- `POST` - Create data
- `PUT`/`PATCH` - Update data
- `DELETE` - Delete data

### 3. Request/Response Cycle

```javascript
async function handler(req, res) {
  // req - incoming request
  const { id } = req.params;  // URL parameters
  const { page } = req.query;  // Query strings
  const data = req.body;       // Request body

  // Process...

  // res - outgoing response
  res.status(200).json({ data });
}
```

### 4. Async/Await

We use async/await for handling asynchronous operations (like database queries).

```javascript
// Old way (callbacks)
query('SELECT * FROM users', (err, result) => {
  if (err) handleError(err);
  // use result
});

// Modern way (async/await)
const result = await query('SELECT * FROM users');
```

**Benefits**:
- Cleaner code
- Easier error handling
- More readable

## Step-by-Step Build Process

### Step 1: Initialize Project

```bash
mkdir backend && cd backend
npm init -y
```

**What happens**: Creates `package.json` with project metadata.

### Step 2: Install Dependencies

```bash
npm install express pg cors helmet compression morgan dotenv express-rate-limit express-validator
npm install --save-dev nodemon jest supertest
```

**Why each package**:

**Production Dependencies**:
- `express`: Web framework
- `pg`: PostgreSQL client for Node.js
- `cors`: Enable Cross-Origin Resource Sharing
- `helmet`: Security middleware (sets HTTP headers)
- `compression`: Compress response bodies (faster transfers)
- `morgan`: HTTP request logger
- `dotenv`: Load environment variables from .env file
- `express-rate-limit`: Prevent abuse by limiting requests
- `express-validator`: Validate and sanitize user input

**Development Dependencies**:
- `nodemon`: Auto-restart server on file changes
- `jest`: Testing framework
- `supertest`: HTTP testing library

### Step 3: Set Up Database Connection

**File**: `src/config/database.js`

**Key Concepts**:

1. **Connection Pooling**:
   ```javascript
   const pool = new Pool({ /* config */ });
   ```
   
   **Why?** Creating database connections is expensive. A pool maintains multiple connections and reuses them, improving performance.

2. **Environment Variables**:
   ```javascript
   host: process.env.DB_HOST
   ```
   
   **Why?** Never hard-code credentials. Use environment variables for:
   - Security (don't commit passwords)
   - Flexibility (different configs for dev/production)

3. **Parameterized Queries**:
   ```javascript
   query('SELECT * FROM users WHERE id = $1', [userId])
   ```
   
   **Why?** Prevents SQL injection attacks. Never concatenate user input into SQL!

### Step 4: Create Middleware

**Error Handler** (`src/middleware/errorHandler.js`):

```javascript
export function errorHandler(err, req, res, next) {
  const { statusCode = 500, message } = err;
  res.status(statusCode).json({ error: message });
}
```

**Why?** Centralized error handling. All errors go through one place, making it easy to:
- Log errors consistently
- Format error responses
- Hide sensitive info in production

**Async Handler**:
```javascript
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Why?** Automatically catches errors in async functions and passes them to error handler. Without this, you'd need try/catch in every route.

### Step 5: Create Models

**Purpose**: Models handle database operations. They're the only part of your code that writes SQL.

**Pattern**:
```javascript
export async function findById(id) {
  const sql = 'SELECT * FROM datasets WHERE id = $1';
  const result = await query(sql, [id]);
  return result.rows[0];
}
```

**Benefits**:
- **Reusability**: Use same function in multiple controllers
- **Testability**: Easy to mock for testing
- **Maintainability**: Database changes happen in one place

### Step 6: Create Controllers

**Purpose**: Controllers contain business logic. They:
1. Extract data from request
2. Validate input
3. Call models
4. Format response

**Pattern**:
```javascript
export async function getDatasetById(req, res) {
  const { id } = req.params;
  const dataset = await DatasetModel.findById(id);
  
  if (!dataset) {
    throw new ApiError(404, 'Dataset not found');
  }
  
  res.json({ success: true, data: dataset });
}
```

**Why separate from routes?** 
- Routes should only define HTTP endpoints
- Controllers contain logic (testable independently)
- Easier to reuse logic

### Step 7: Create Routes

**Purpose**: Map HTTP endpoints to controller functions.

**Pattern**:
```javascript
router.get('/:id', asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
```

**RESTful Design**:
- `GET /datasets` - List datasets
- `GET /datasets/:id` - Get one dataset
- `POST /datasets` - Create dataset
- `PUT /datasets/:id` - Update dataset
- `DELETE /datasets/:id` - Delete dataset

### Step 8: Create Server

**File**: `src/server.js`

**Setup Order** (important!):
1. Import dependencies
2. Create Express app
3. **Security middleware** (helmet, cors, rate limit)
4. **Body parsing** (express.json)
5. **Logging** (morgan)
6. **Routes**
7. **Error handling** (must be last!)

**Server Startup**:
```javascript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Graceful Shutdown**:
```javascript
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
```

**Why?** Properly close database connections when server stops.

## Key Components Explained

### 1. Environment Configuration

**`.env` file**:
```env
PORT=3000
DB_HOST=localhost
DB_NAME=w4h_database
```

**Loading**:
```javascript
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
```

**Best Practices**:
- Never commit `.env` to git
- Provide `.env.example` with dummy values
- Use defaults for optional values
- Validate required variables on startup

### 2. Error Handling

**Types of Errors**:

1. **Operational Errors** (expected):
   - Invalid user input
   - Database not found
   - Network issues
   
   **Handling**: Send appropriate HTTP status and message

2. **Programming Errors** (bugs):
   - Typos
   - Logic errors
   - Accessing undefined
   
   **Handling**: Log, alert developers, return 500

**Custom Error Class**:
```javascript
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Flag for expected errors
  }
}
```

### 3. Input Validation

**Why validate?**
- Security: Prevent injection attacks
- Data integrity: Ensure data quality
- Better errors: Give users helpful feedback

**Using express-validator**:
```javascript
import { body, validationResult } from 'express-validator';

router.post('/', 
  body('name').notEmpty().trim(),
  body('email').isEmail(),
  validate, // Check for errors
  controller.create
);
```

### 4. CORS (Cross-Origin Resource Sharing)

**The Problem**: Browsers block requests from different origins (domains).

```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

These are different origins!

**The Solution**:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

Backend tells browser: "Allow requests from frontend."

### 5. Rate Limiting

**Why?** Prevent abuse and DDoS attacks.

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api', limiter);
```

If user exceeds limit, return 429 (Too Many Requests).

## Database Design

### Tables

**datasets**:
```sql
CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Decisions**:
- `SERIAL`: Auto-incrementing ID
- `JSONB`: Flexible metadata storage
- `created_at/updated_at`: Track changes

**Indexes**:
```sql
CREATE INDEX idx_datasets_type ON datasets(type);
```

**Why?** Speeds up queries filtering by type.

### JSONB vs Separate Columns

**JSONB** (used for metadata):
-  Flexible schema
-  Can store any structure
-  Slower queries
-  Less type safety

**Separate Columns**:
-  Fast queries
-  Type validation
-  Rigid schema
-  Hard to change

**Rule of Thumb**: Use JSONB for optional/variable data.

### Relationships

```sql
CREATE TABLE timeseries_data (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  ...
);
```

**`REFERENCES`**: Foreign key constraint. Ensures `dataset_id` exists in `datasets` table.

**`ON DELETE CASCADE`**: When dataset deleted, delete related timeseries data.

## Security Best Practices

### 1. SQL Injection Prevention

 **BAD** (vulnerable):
```javascript
const sql = `SELECT * FROM users WHERE id = ${userId}`;
```

An attacker could set `userId = "1 OR 1=1"` to get all users!

 **GOOD** (safe):
```javascript
const sql = 'SELECT * FROM users WHERE id = $1';
await query(sql, [userId]);
```

Parameters are escaped automatically.

### 2. Sensitive Data

**Never expose**:
- Passwords (hash with bcrypt)
- API keys
- Database credentials
- Stack traces (in production)

**Production vs Development**:
```javascript
if (process.env.NODE_ENV === 'production') {
  message = 'Internal server error';
} else {
  message = err.stack; // Full error for debugging
}
```

### 3. Security Headers (Helmet)

```javascript
app.use(helmet());
```

Sets headers like:
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking
- `Strict-Transport-Security`: Force HTTPS

### 4. Rate Limiting

Prevents:
- Brute force attacks
- DDoS attacks
- Resource exhaustion

### 5. Input Validation

**Always validate**:
- Type (string, number, email, etc.)
- Length/range
- Format (regex)
- Sanitize (remove HTML, trim whitespace)

## Testing Strategy

### Unit Tests

Test individual functions in isolation:

```javascript
test('findById returns dataset', async () => {
  const dataset = await Dataset.findById(1);
  expect(dataset).toBeDefined();
  expect(dataset.id).toBe(1);
});
```

### Integration Tests

Test API endpoints:

```javascript
test('GET /api/datasets returns 200', async () => {
  const response = await request(app)
    .get('/api/datasets');
  
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.data)).toBe(true);
});
```

### Test Database

**Best Practice**: Use separate test database.

```javascript
// test.env
DB_NAME=w4h_test
```

**Cleanup**: Reset database between tests.

## Common Patterns

### 1. Async Route Handler

```javascript
router.get('/', asyncHandler(async (req, res) => {
  const data = await Model.findAll();
  res.json({ data });
}));
```

### 2. Pagination

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const offset = (page - 1) * limit;

const data = await Model.findAll({ limit, offset });
const total = await Model.count();

res.json({
  data,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

### 3. Not Found Handling

```javascript
const item = await Model.findById(id);
if (!item) {
  throw new ApiError(404, 'Item not found');
}
```

### 4. Transaction

```javascript
const client = await getClient();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill process on port 3000:
```powershell
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

**Checklist**:
1. Is PostgreSQL running?
2. Are credentials correct?
3. Does database exist?
4. Is firewall blocking connection?

**Test connection**:
```powershell
psql -h localhost -U postgres -d w4h_database
```

### CORS Errors

**Symptoms**: Frontend gets blocked request

**Check**:
1. Backend has CORS middleware
2. Frontend origin is in allowed list
3. Credentials setting matches

### Module Not Found

**Error**: `Cannot find module 'express'`

**Solution**: Install dependencies:
```bash
npm install
```

## Next Steps for Learning

### 1. Add Authentication
- Learn JWT (JSON Web Tokens)
- Implement login/signup
- Protect routes with auth middleware

### 2. Add Real-time Features
- Learn WebSockets (socket.io)
- Implement live updates
- Add notifications

### 3. Optimize Performance
- Add caching (Redis)
- Implement pagination everywhere
- Use database indexes effectively

### 4. Improve Testing
- Increase test coverage
- Add load testing
- Test error scenarios

### 5. Add Documentation
- Use Swagger/OpenAPI
- Generate API docs automatically
- Add inline code documentation

## Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Tutorials
- [MDN - Express Tutorial](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs)
- [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Summary

You now have a production-ready Express backend with:

 **RESTful API** - Clean, predictable endpoints
 **Database Integration** - PostgreSQL with connection pooling
 **Security** - Helmet, CORS, rate limiting, input validation
 **Error Handling** - Centralized, informative errors
 **Testing** - Unit and integration tests
 **Documentation** - Well-commented, structured code
 **Scalability** - MVC pattern, modular design

**Key Takeaways**:
1. Structure matters - organize code logically
2. Security is not optional - validate, sanitize, protect
3. Test everything - catch bugs early
4. Use environment variables - never hard-code secrets
5. Handle errors properly - help users and yourself debug

Happy coding! 🚀
