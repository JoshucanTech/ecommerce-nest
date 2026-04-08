#!/bin/sh
set -e

echo "=== NestJS Production Startup ==="
echo "Port: $PORT"

# Ensure migrations are applied before starting the service
echo "🚀 Applying database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully."
else
    echo "❌ Migration failed! Check your database connection and logs."
    exit 1
fi

# We skip automatic seeding in production to avoid accidental data resets
echo "ℹ️  Skipping automatic database seeding."
echo "   To seed manually: docker compose --profile seed up seed"

echo "🏁 Starting NestJS Application..."
# Using exec to replace the shell process with the Node process
exec node dist/src/main.js