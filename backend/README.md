# W4H Backend API

Express-based REST API server for the W4H application.

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Main server entry point
│   ├── config/
│   │   └── database.js        # PostgreSQL connection pooling
│   ├── routes/
│   │   ├── health.js          # Health check endpoints
│   │   ├── datasets.js        # Dataset API routes
│   │   └── documentation.js   # Documentation API routes
│   ├── controllers/
│   │   ├── datasetController.js
│   │   └── documentationController.js
│   ├── models/
│   │   ├── Dataset.js         # Dataset database operations
│   │   └── Documentation.js   # Documentation database operations
│   ├── middleware/
│   │   ├── errorHandler.js    # Error handling middleware
│   │   ├── logger.js          # Request logging
│   │   └── validator.js       # Input validation
│   └── utils/
│       ├── schema.js          # Database schema definitions
│       └── initDb.js          # Database initialization script
├── tests/
│   ├── api.test.js           # API endpoint tests
│   └── README.md
├── .env.example              # Environment variable template
├── package.json
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=w4h_database
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Initialize Database

Make sure PostgreSQL is running, then initialize the schema:

```bash
# Create schema only
npm run db:init

# Create schema with sample data
npm run db:init:sample
```

Or from the root directory:

```bash
npm run db:init
# or
npm run db:init:sample
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3000`

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/db` - Database health check
- `GET /health/detailed` - Detailed system information

### Datasets API

Base path: `/api/v1/datasets`

- `GET /api/v1/datasets` - List all datasets
  - Query params: `page`, `limit`, `type`
- `GET /api/v1/datasets/:id` - Get dataset by ID
- `GET /api/v1/datasets/:id/metadata` - Get dataset metadata
- `GET /api/v1/datasets/:id/data` - Get dataset data
- `GET /api/v1/datasets/:id/timeseries` - Get timeseries data
- `POST /api/v1/datasets` - Create dataset
- `PUT /api/v1/datasets/:id` - Update dataset
- `DELETE /api/v1/datasets/:id` - Delete dataset

### Documentation API

Base path: `/api/v1/documentation`

- `GET /api/v1/documentation` - List all documentation
  - Query params: `page`, `limit`, `type`
- `GET /api/v1/documentation/:id` - Get documentation by ID
- `GET /api/v1/documentation/slug/:slug` - Get documentation by slug
- `GET /api/v1/documentation/search?q=query` - Search documentation
- `POST /api/v1/documentation` - Create documentation
- `PUT /api/v1/documentation/:id` - Update documentation
- `DELETE /api/v1/documentation/:id` - Delete documentation

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Database

The application uses PostgreSQL with the following tables:

### `datasets`
Stores dataset metadata
- `id` - Serial primary key
- `name` - Dataset name
- `description` - Description
- `type` - Dataset type (timeseries, categorical, etc.)
- `metadata` - JSONB for flexible metadata
- `created_at`, `updated_at` - Timestamps

### `documentation`
Stores markdown documentation
- `id` - Serial primary key
- `title` - Document title
- `slug` - URL-friendly identifier
- `content` - Markdown content
- `type` - Documentation type (developer, user, vendor)
- `tags` - JSONB array of tags
- `created_at`, `updated_at` - Timestamps

### `timeseries_data`
Example timeseries data table
- `id` - Serial primary key
- `dataset_id` - Foreign key to datasets
- `subject_id` - Subject identifier
- `timestamp` - Data timestamp
- `value` - Numeric value
- `metadata` - JSONB for additional data
- `created_at` - Timestamp

## Architecture

### MVC Pattern

The backend follows the Model-View-Controller pattern:

- **Routes** - Define API endpoints
- **Controllers** - Handle request/response logic
- **Models** - Database operations and business logic

### Middleware Stack

1. **Security** (Helmet) - Secure HTTP headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - Prevent abuse
4. **Compression** - Compress responses
5. **Body Parsing** - Parse JSON/URL-encoded bodies
6. **Logging** (Morgan) - HTTP request logging
7. **Error Handling** - Centralized error handling

## Security Features

- **Helmet** - Security headers
- **CORS** - Controlled cross-origin access
- **Rate Limiting** - DDoS protection
- **Parameterized Queries** - SQL injection prevention
- **Input Validation** - express-validator
- **Environment Variables** - Sensitive data protection

## Development Tips

### Adding New Routes

1. Create route file in `src/routes/`
2. Create controller in `src/controllers/`
3. Create model in `src/models/` (if needed)
4. Import and use in `src/server.js`

### Database Queries

Use the query function for parameterized queries:

```javascript
import { query } from '../config/database.js';

const result = await query(
  'SELECT * FROM datasets WHERE id = $1',
  [id]
);
```

### Error Handling

Use ApiError for expected errors:

```javascript
import { ApiError } from '../middleware/errorHandler.js';

if (!dataset) {
  throw new ApiError(404, 'Dataset not found');
}
```

Use asyncHandler for async routes:

```javascript
import { asyncHandler } from '../middleware/errorHandler.js';

router.get('/', asyncHandler(async (req, res) => {
  // Your async code
}));
```

## Environment Variables

See `.env.example` for all available options:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database config
- `DB_POOL_MAX` - Max database connections
- `CORS_ORIGINS` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## API Documentation

For interactive API documentation, consider adding Swagger/OpenAPI in the future.

## Debugging

Enable detailed logging:

```bash
LOG_LEVEL=debug npm run dev
```

Use Node.js debugger:

```bash
node --inspect src/server.js
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong database password
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS
- [ ] Configure rate limits appropriately
- [ ] Set up monitoring and logging
- [ ] Regular database backups

## Dependencies

### Production
- `express` - Web framework
- `pg` - PostgreSQL client
- `cors` - CORS middleware
- `helmet` - Security headers
- `compression` - Response compression
- `morgan` - HTTP logger
- `dotenv` - Environment variables
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation

### Development
- `nodemon` - Auto-reload on file changes
- `jest` - Testing framework
- `supertest` - HTTP testing

## Learn More

See [BACKEND_SETUP.md](../BACKEND_SETUP.md) for detailed setup instructions and learning resources.
