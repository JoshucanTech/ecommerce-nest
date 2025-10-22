const { spawn } = require('child_process');

console.log('Testing application startup...');

// Start the application
const app = spawn('node', ['dist/src/main.js'], {
  env: {
    ...process.env,
    PORT: 3000,
    NODE_ENV: 'development'
  }
});

let started = false;

app.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[APP STDOUT]', output);
  
  if (output.includes('Application is running on:')) {
    console.log('✅ Application started successfully');
    started = true;
    // Give it a few seconds then exit
    setTimeout(() => {
      app.kill();
      console.log('✅ Test completed');
      process.exit(0);
    }, 5000);
  }
});

app.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('[APP STDERR]', output);
});

app.on('error', (err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});

app.on('close', (code) => {
  if (!started) {
    console.log(`❌ Application exited with code ${code} before starting`);
    process.exit(code || 1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  if (!started) {
    console.error('❌ Application failed to start within 30 seconds');
    app.kill();
    process.exit(1);
  }
}, 30000);