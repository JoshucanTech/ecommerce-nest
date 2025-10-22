#!/bin/sh
set -e

echo 'Running database migrations...'
npx prisma migrate deploy

if [ "$RUN_SEED" = "1" ]; then
  echo 'Running database seeding...'
  npx prisma db seed
fi

echo 'Starting application...'

exec node dist/src/main.js