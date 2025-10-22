#!/bin/sh
set -e

echo '=== Starting Application ==='
echo 'Current directory:'
pwd
echo 'Directory contents:'
ls -la
echo 'Dist directory contents:'
ls -la dist/ || echo 'No dist directory'
echo 'Dist/src directory contents:'
ls -la dist/src/ || echo 'No dist/src directory'

echo 'Running database migrations...'
npx prisma migrate deploy

if [ "$RUN_SEED" = "1" ]; then
  echo 'Running database seeding...'
  npx prisma db seed
fi

echo 'Starting application...'
echo "Using PORT: $PORT"
exec node dist/src/main.js