#!/bin/sh
set -e

echo '=== Starting Application ==='
echo "PORT: $PORT"

# Always run migrations
echo 'Running database migrations...'
npx prisma migrate deploy
echo '✅ Migrations completed successfully!'

# Skip seeding entirely in production for now
echo 'Skipping database seeding in production'
echo 'To seed database, run manually: npx prisma db seed'

echo 'Starting NestJS application...'
exec node dist/src/main.js