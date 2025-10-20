# E-commerce NestJS Backend

## Prerequisites

Before running the application, ensure you have the following installed:

- Node.js (version 16 or higher)
- PostgreSQL
- Redis

## Running Redis locally

You have several options to run Redis locally:

### Option 1: Using Docker (Recommended)

```bash
docker run -d -p 6379:6379 redis:alpine
```

### Option 2: Using Windows Subsystem for Linux (WSL)

```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Option 3: Using Chocolatey on Windows

```powershell
choco install redis-64
redis-server
```

## Running PostgreSQL locally

Make sure PostgreSQL is running on port 5432 with the following credentials:

- Database: ecommerce
- User: postgres
- Password: secret2580

You can also run PostgreSQL with Docker:

```bash
docker run -d \
  --name ecommerce-postgres \
  -e POSTGRES_DB=ecommerce \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secret2580 \
  -p 5432:5432 \
  postgres:15-alpine
```

## Environment Variables

The application uses the following environment variables, which are defined in the `.env` file:

- `PORT`: The port the application will run on (default: 4000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

## Running the Application

1. Install dependencies:

```bash
npm install
```

2. Run database migrations:

```bash
npx prisma migrate dev
```

3. Seed the database (optional):

```bash
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:4000

## Health Check

You can check the Redis connection status at:

```
GET http://localhost:4000/real-time/redis-health
```

This endpoint will return information about the Redis connection status..
