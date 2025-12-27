const io = require('socket.io-client');
const axios = require('axios');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Yzc5ZGE3ZC0zMGI5LTRjOWEtYTM0NC05NjJhZGRjN2RiMTEiLCJlbWFpbCI6ImJ1eWVyQGV4YW1wbGUuY29tIiwicm9sZSI6IkJVWUVSIiwiaWF0IjoxNzY2NTg5NDA2LCJleHAiOjE3NjY2NzU4MDZ9.aHlj8PmxLIwdNI5s2R0nfbgZTscGJ84v9ylMD2M7XuE';

async function testCompleteChat() {
  console.log('🧪 Testing Complete Chat Functionality');
  console.log('=====================================');
  
  try {
    // 1. Test REST API - Get conversations
    console.log('1️⃣ Testing REST API...');
    const conversations = await axios.get('http://localhost:4000/api/messages/conversations', {
      headers: { Authorization: `Bearer ${JWT_TOKEN}` }
    });
    console.log(`✅ Found ${conversations.data.length} conversations`);
    
    let conversationId;
    if (conversations.data.length > 0) {
      conversationId = conversations.data[0].id;
      console.log(`✅ Using existing conversation: ${conversationId}`);
    } else {
      console.log('❌ No conversations found - create one first via API');
      return;
    }
    
    // 2. Test WebSocket connection
    console.log('\n2️⃣ Testing WebSocket connection...');
    const socket = io('http://localhost:4000/messages', {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });
    
    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
    });
    
    // 3. Test conversation joining
    console.log('\n3️⃣ Testing conversation access...');
    const joinResult = await new Promise((resolve) => {
      socket.emit('conversation:join', { conversationId }, (response) => {
        resolve(response);
      });
    });
    console.log('✅ Conversation join result:', joinResult);
    
    // 4. Test message sending with database persistence
    console.log('\n4️⃣ Testing message persistence...');
    const messagePromise = new Promise((resolve) => {
      socket.on('message:new', (data) => {
        console.log('✅ Real-time message received:', data.content);
        resolve(data);
      });
    });
    
    socket.emit('message:send', {
      conversationId,
      content: `Test message at ${new Date().toISOString()}`,
      messageType: 'TEXT'
    });
    
    const receivedMessage = await messagePromise;
    
    // 5. Verify message was saved to database
    console.log('\n5️⃣ Verifying database persistence...');
    const messages = await axios.get(`http://localhost:4000/api/messages/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${JWT_TOKEN}` }
    });
    
    const savedMessage = messages.data.find(m => m.content === receivedMessage.content);
    if (savedMessage) {
      console.log('✅ Message persisted to database');
      console.log(`   ID: ${savedMessage.id}`);
      console.log(`   Content: ${savedMessage.content}`);
      console.log(`   Created: ${savedMessage.createdAt}`);
    } else {
      console.log('❌ Message not found in database');
    }
    
    // 6. Test typing indicators
    console.log('\n6️⃣ Testing typing indicators...');
    socket.emit('typing:start', { conversationId });
    await new Promise(resolve => setTimeout(resolve, 1000));
    socket.emit('typing:stop', { conversationId });
    console.log('✅ Typing indicators sent');
    
    // 7. Test message reactions
    console.log('\n7️⃣ Testing message reactions...');
    socket.emit('message:reaction', {
      messageId: savedMessage.id,
      emoji: '👍'
    });
    console.log('✅ Reaction sent');
    
    socket.disconnect();
    console.log('\n🎉 Complete chat functionality test PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCompleteChat();