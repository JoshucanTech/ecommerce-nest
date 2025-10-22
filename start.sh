#!/bin/sh
set -e

echo '=== Starting Application ==='
echo "PORT: $PORT"

# Only run migrations if explicitly set
if [ "$RUN_MIGRATIONS" = "1" ]; then
    echo 'Running database migrations...'
    npx prisma migrate deploy
    
    if [ "$RUN_SEED" = "1" ]; then
        echo 'Running database seeding...'
        npx prisma db seed
    fi
else
    echo 'Skipping migrations (set RUN_MIGRATIONS=1 to run them)'
fi

echo 'Starting NestJS application...'
exec node dist/src/main.js