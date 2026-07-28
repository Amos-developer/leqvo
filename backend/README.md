# Leqvo Backend

Express MVC API for the Leqvo signal trading platform.

## Structure

```text
src/
  app.js                 Express app setup
  server.js              Database connection and server startup
  config/                Environment and PostgreSQL configuration
  controllers/           Request handlers
  models/                Database queries and data access
  routes/                API route definitions
  middlewares/           Express middleware
  utils/                 Shared helpers
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Create a PostgreSQL database named `leqvo`, then update `.env` if your local credentials are different.

4. Start the API:

```bash
npm run dev
```

Health check:

```text
GET /api/health
```
