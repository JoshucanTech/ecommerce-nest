const io = require('socket.io-client');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Yzc5ZGE3ZC0zMGI5LTRjOWEtYTM0NC05NjJhZGRjN2RiMTEiLCJlbWFpbCI6ImJ1eWVyQGV4YW1wbGUuY29tIiwicm9sZSI6IkJVWUVSIiwiaWF0IjoxNzY2NTg5NDA2LCJleHAiOjE3NjY2NzU4MDZ9.aHlj8PmxLIwdNI5s2R0nfbgZTscGJ84v9ylMD2M7XuE';

// Try different ports - check which one your NestJS server is running on
const PORTS = [4000];
let currentPortIndex = 0;

function tryConnection(port) {
  console.log(`🔄 Trying connection to port ${port}...`);
  
  const socket = io(`http://localhost:${port}/messages`, {
    auth: { token: JWT_TOKEN },
    transports: ['websocket'], // Force WebSocket transport
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log(`✅ Connected to port ${port}!`);
    console.log('🆔 Socket ID:', socket.id);
    
    // Test message sending
    setTimeout(() => {
      console.log('📤 Testing message send...');
      socket.emit('message:send', {
        conversationId: 'test-123',
        content: 'Test message',
        messageType: 'TEXT'
      });
    }, 1000);
    
    // Disconnect after 5 seconds
    setTimeout(() => {
      console.log('🔚 Disconnecting...');
      socket.disconnect();
    }, 5000);
  });

  socket.on('message:new', (data) => {
    console.log('📨 Received message:', data.content);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Port ${port} failed:`, error.message);
    
    // Try next port
    currentPortIndex++;
    if (currentPortIndex < PORTS.length) {
      setTimeout(() => tryConnection(PORTS[currentPortIndex]), 1000);
    } else {
      console.log('❌ All ports failed. Make sure your NestJS server is running.');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('✅ Clean disconnect:', reason);
  });
}

// Start testing
tryConnection(PORTS[currentPortIndex]);