const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'buyer@example.com',
      password: 'buyer123'
    });
    
    console.log('JWT Token:', response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

getToken();