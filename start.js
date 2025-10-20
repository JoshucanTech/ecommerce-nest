const { execSync } = require('child_process');

try {
  // Run database migrations
  console.log('Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Check if seeding should be run
  if (process.env.RUN_SEED === '1') {
    console.log('Running database seeding...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
  }
  
  // Start the main application
  console.log('Starting application...');
  execSync('node dist/src/main.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error during startup:', error.message);
  process.exit(1);
}