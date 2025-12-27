const io = require('socket.io-client');

// Test WebSocket connection
const socket = io('http://localhost:3000/messages', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE' // Replace with actual JWT token
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Join a conversation
  socket.emit('conversation:join', { conversationId: 'CONVERSATION_ID' });
  
  // Send a test message
  socket.emit('message:send', {
    conversationId: 'CONVERSATION_ID',
    content: 'Hello from WebSocket client!',
    messageType: 'TEXT'
  });
});

// Listen for real-time events
socket.on('message:new', (data) => {
  console.log('New message received:', data);
});

socket.on('typing:start', (data) => {
  console.log('User started typing:', data);
});

socket.on('typing:stop', (data) => {
  console.log('User stopped typing:', data);
});

socket.on('message:reaction', (data) => {
  console.log('Message reaction:', data);
});

socket.on('user:online', (data) => {
  console.log('User came online:', data);
});

socket.on('user:offline', (data) => {
  console.log('User went offline:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});