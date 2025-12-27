const io = require('socket.io-client');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Yzc5ZGE3ZC0zMGI5LTRjOWEtYTM0NC05NjJhZGRjN2RiMTEiLCJlbWFpbCI6ImJ1eWVyQGV4YW1wbGUuY29tIiwicm9sZSI6IkJVWUVSIiwiaWF0IjoxNzY2NTg5NDA2LCJleHAiOjE3NjY2NzU4MDZ9.aHlj8PmxLIwdNI5s2R0nfbgZTscGJ84v9ylMD2M7XuE';

const CONVERSATION_ID = 'test-room-123';
const NUM_CLIENTS = 3;

function createClient(clientId) {
  const socket = io('http://localhost:4000/messages', {
    auth: { token: JWT_TOKEN },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log(`✅ Client ${clientId} connected (${socket.id})`);
    
    // Join conversation room
    socket.emit('conversation:join', { conversationId: CONVERSATION_ID });
    
    // Send a message after delay
    setTimeout(() => {
      console.log(`📤 Client ${clientId} sending message...`);
      socket.emit('message:send', {
        conversationId: CONVERSATION_ID,
        content: `Hello from Client ${clientId}!`,
        messageType: 'TEXT'
      });
    }, clientId * 1000); // Stagger messages
  });

  // Listen for messages from other clients
  socket.on('message:new', (data) => {
    console.log(`📨 Client ${clientId} received: "${data.content}"`);
  });

  // Listen for typing indicators
  socket.on('typing:start', (data) => {
    console.log(`⌨️ Client ${clientId} sees typing from: ${data.userId}`);
  });

  socket.on('typing:stop', (data) => {
    console.log(`⏹️ Client ${clientId} sees typing stopped from: ${data.userId}`);
  });

  // Listen for user presence
  socket.on('user:online', (data) => {
    console.log(`🟢 Client ${clientId} sees user online: ${data.userId}`);
  });

  socket.on('user:offline', (data) => {
    console.log(`🔴 Client ${clientId} sees user offline: ${data.userId}`);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Client ${clientId} connection error:`, error.message);
  });

  // Test typing indicators
  setTimeout(() => {
    console.log(`⌨️ Client ${clientId} starts typing...`);
    socket.emit('typing:start', { conversationId: CONVERSATION_ID });
    
    setTimeout(() => {
      console.log(`⏹️ Client ${clientId} stops typing...`);
      socket.emit('typing:stop', { conversationId: CONVERSATION_ID });
    }, 2000);
  }, (clientId + 3) * 1000);

  // Disconnect after 15 seconds
  setTimeout(() => {
    console.log(`🔚 Client ${clientId} disconnecting...`);
    socket.disconnect();
  }, 15000);

  return socket;
}

console.log(`🚀 Starting ${NUM_CLIENTS} WebSocket clients...`);
console.log(`📍 Conversation ID: ${CONVERSATION_ID}`);
console.log('---');

// Create multiple clients
const clients = [];
for (let i = 1; i <= NUM_CLIENTS; i++) {
  clients.push(createClient(i));
}

// Clean exit after 20 seconds
setTimeout(() => {
  console.log('🏁 Test completed!');
  process.exit(0);
}, 20000);