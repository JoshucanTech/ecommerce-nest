const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testMessagesAPI() {
  try {
    // 1. Create a conversation
    console.log('Creating conversation...');
    const conversation = await api.post('/messages/conversations', {
      participants: ['USER_ID_1', 'USER_ID_2'], // Replace with actual user IDs
      initialMessage: 'Hello, this is a test conversation!'
    });
    console.log('Conversation created:', conversation.data);
    
    const conversationId = conversation.data.id;
    
    // 2. Send a message
    console.log('Sending message...');
    const message = await api.post('/messages', {
      conversationId,
      content: 'This is a test message',
      messageType: 'TEXT'
    });
    console.log('Message sent:', message.data);
    
    // 3. Get conversations
    console.log('Getting conversations...');
    const conversations = await api.get('/messages/conversations');
    console.log('Conversations:', conversations.data);
    
    // 4. Get conversation messages
    console.log('Getting messages...');
    const messages = await api.get(`/messages/conversations/${conversationId}/messages`);
    console.log('Messages:', messages.data);
    
    // 5. Mark as read
    console.log('Marking as read...');
    await api.put(`/messages/conversations/${conversationId}/read`);
    console.log('Marked as read');
    
  } catch (error) {
    console.error('API Test Error:', error.response?.data || error.message);
  }
}

testMessagesAPI();