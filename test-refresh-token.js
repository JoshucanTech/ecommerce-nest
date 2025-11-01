const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testRefreshToken() {
  try {
    console.log('Testing refreshToken endpoint...\n');
    
    // Step 1: Register a new user
    console.log('1. Registering a new user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      role: 'BUYER'
    });
    
    console.log('   Registration successful!');
    console.log('   User ID:', registerResponse.data.user.id);
    
    // Extract tokens from registration response
    const { accessToken, refreshToken } = registerResponse.data;
    console.log('   Access token (first 50 chars):', accessToken.substring(0, 50) + '...');
    console.log('   Refresh token (first 50 chars):', refreshToken.substring(0, 50) + '...\n');
    
    // Step 2: Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Use refresh token to get new tokens
    console.log('2. Refreshing token...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    console.log('   Token refresh successful!');
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
    console.log('   New access token (first 50 chars):', newAccessToken.substring(0, 50) + '...');
    console.log('   New refresh token (first 50 chars):', newRefreshToken.substring(0, 50) + '...\n');
    
    // Step 4: Test using the new access token
    console.log('3. Testing new access token...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`
      }
    });
    
    console.log('   Profile access successful!');
    console.log('   User name:', profileResponse.data.firstName, profileResponse.data.lastName);
    
    console.log('\n✅ All tests passed! refreshToken endpoint is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n   Troubleshooting tips:');
      console.log('   - Make sure the refresh token is valid and not expired');
      console.log('   - Check that the refreshToken is correctly formatted');
      console.log('   - Ensure the backend is running on port 4000');
    }
  }
}

// Run the test
testRefreshToken();