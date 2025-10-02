#!/bin/sh

echo "=== Starting Development Server ==="

# Clean up any existing dist folder that might cause conflicts
if [ -d "dist" ]; then
    echo "Cleaning existing dist folder to avoid conflicts..."
    rm -rf dist
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Generate Prisma client if needed
if [ ! -f "node_modules/.prisma" ]; then
    echo "Generating Prisma client..."
    npx prisma generate
fi

# Run migrations only once
if [ ! -f "prisma/migrations/migration_done" ]; then
    echo "Running database migrations..."
    if npx prisma migrate deploy; then
        touch prisma/migrations/migration_done
        echo "Migrations completed successfully"
    else
        echo "Migration failed, but continuing with development..."
    fi
fi

echo "Starting NestJS development server..."
echo "File changes will be watched automatically..."

# Start with enhanced file watching for Docker
exec npm run start:dev