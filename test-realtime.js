const io = require('socket.io-client');
const axios = require('axios');

// Replace with actual JWT token from your auth system
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Yzc5ZGE3ZC0zMGI5LTRjOWEtYTM0NC05NjJhZGRjN2RiMTEiLCJlbWFpbCI6ImJ1eWVyQGV4YW1wbGUuY29tIiwicm9sZSI6IkJVWUVSIiwiaWF0IjoxNzY2NTg5NDA2LCJleHAiOjE3NjY2NzU4MDZ9.aHlj8PmxLIwdNI5s2R0nfbgZTscGJ84v9ylMD2M7XuE';

async function testRealtime() {
  try {
    // First get existing conversations
    console.log('🔄 Getting existing conversations...');
    const conversationsResponse = await axios.get(
      'http://localhost:4000/api/messages/conversations',
      {
        headers: { Authorization: `Bearer ${JWT_TOKEN}` },
      },
    );
    
    let conversationId;
    
    if (conversationsResponse.data.length > 0) {
      // Use existing conversation
      conversationId = conversationsResponse.data[0].id;
      console.log('✅ Using existing conversation:', conversationId);
    } else {
      // Create new conversation with dummy user ID
      console.log('🔄 Creating new conversation...');
      const response = await axios.post(
        'http://localhost:4000/api/messages/conversations',
        {
          participants: ['dummy-user-id-123'], // Different user ID
          initialMessage: 'Test conversation',
        },
        {
          headers: { Authorization: `Bearer ${JWT_TOKEN}` },
        },
      );
      conversationId = response.data.id;
      console.log('✅ Conversation created:', conversationId);
    }
    
    // Now connect to WebSocket
    const socket = io('http://localhost:4000/messages', {
      auth: { token: JWT_TOKEN }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      
      // Join the conversation
      socket.emit('conversation:join', { conversationId });
      
      // Test message sending with real conversation ID
      setTimeout(() => {
        console.log('📤 Sending message...');
        socket.emit('message:send', {
          conversationId,
          content: 'Hello from test client!',
          messageType: 'TEXT'
        });
      }, 1000);
    });

    // Listen for real-time events
    socket.on('message:new', (data) => {
      console.log('📨 New message received:', data.content);
    });

    socket.on('typing:start', (data) => {
      console.log('⌨️ User typing:', data.userId);
    });

    socket.on('user:online', (data) => {
      console.log('🟢 User online:', data.userId);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection failed:', error.message);
    });

    socket.on('error', (error) => {
      console.log('❌ Socket error:', error);
    });

    // Test functions
    setTimeout(() => {
      console.log('⌨️ Starting typing...');
      socket.emit('typing:start', { conversationId });
    }, 3000);

    setTimeout(() => {
      console.log('⏹️ Stopping typing...');
      socket.emit('typing:stop', { conversationId });
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRealtime();