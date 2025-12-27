const io = require('socket.io-client');

const JWT_TOKEN_1 = 'USER_1_JWT_TOKEN';
const JWT_TOKEN_2 = 'USER_2_JWT_TOKEN';

// Client 1 (Sender)
const client1 = io('http://localhost:3000/messages', {
  auth: { token: JWT_TOKEN_1 }
});

// Client 2 (Receiver)
const client2 = io('http://localhost:3000/messages', {
  auth: { token: JWT_TOKEN_2 }
});

client1.on('connect', () => {
  console.log('👤 Client 1 connected');
  
  // Join conversation
  client1.emit('conversation:join', { conversationId: 'test-conv' });
  
  // Send message after 2 seconds
  setTimeout(() => {
    client1.emit('message:send', {
      conversationId: 'test-conv',
      content: 'Hello from Client 1!',
      messageType: 'TEXT'
    });
  }, 2000);
});

client2.on('connect', () => {
  console.log('👤 Client 2 connected');
  
  // Join same conversation
  client2.emit('conversation:join', { conversationId: 'test-conv' });
});

// Both clients listen for messages
client1.on('message:new', (data) => {
  console.log('📨 Client 1 received:', data.content);
});

client2.on('message:new', (data) => {
  console.log('📨 Client 2 received:', data.content);
});

// Test typing indicators
client1.on('typing:start', (data) => {
  console.log('⌨️ Client 1 sees typing from:', data.userId);
});

client2.on('typing:start', (data) => {
  console.log('⌨️ Client 2 sees typing from:', data.userId);
});