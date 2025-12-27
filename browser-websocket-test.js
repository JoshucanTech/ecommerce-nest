// Run this in browser console after including socket.io client
// <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>

const socket = io('http://localhost:3000/messages', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  
  // Test joining conversation
  socket.emit('conversation:join', { conversationId: 'test-conversation-id' });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket');
});

// Message events
socket.on('message:new', (data) => {
  console.log('📨 New message:', data);
});

// Typing events
socket.on('typing:start', (data) => {
  console.log('⌨️ User typing:', data.userId);
});

socket.on('typing:stop', (data) => {
  console.log('⏹️ User stopped typing:', data.userId);
});

// User presence
socket.on('user:online', (data) => {
  console.log('🟢 User online:', data.userId);
});

socket.on('user:offline', (data) => {
  console.log('🔴 User offline:', data.userId);
});

// Test functions
function sendMessage(conversationId, content) {
  socket.emit('message:send', {
    conversationId,
    content,
    messageType: 'TEXT'
  });
}

function startTyping(conversationId) {
  socket.emit('typing:start', { conversationId });
}

function stopTyping(conversationId) {
  socket.emit('typing:stop', { conversationId });
}

function addReaction(messageId, emoji) {
  socket.emit('message:reaction', { messageId, emoji });
}

// Usage examples:
// sendMessage('conversation-id', 'Hello World!');
// startTyping('conversation-id');
// stopTyping('conversation-id');
// addReaction('message-id', '👍');