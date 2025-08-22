const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing backend health...');
    const healthResponse = await axios.get('http://127.0.0.1:5000/api/health');
    console.log('Health check:', healthResponse.data);

    console.log('\nTesting auth endpoints...');
    
    // Test registration
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    try {
      const registerResponse = await axios.post('http://127.0.0.1:5000/api/auth/register', registerData);
      console.log('Registration successful:', registerResponse.data);
    } catch (registerError) {
      if (registerError.response?.status === 400) {
        console.log('User already exists, trying login...');
      } else {
        console.log('Registration error:', registerError.response?.data || registerError.message);
      }
    }

    // Test login
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const loginResponse = await axios.post('http://127.0.0.1:5000/api/auth/login', loginData);
    console.log('Login successful:', loginResponse.data);

    const token = loginResponse.data.data.token;
    console.log('Token received:', token.substring(0, 20) + '...');

    // Test profile endpoint
    const profileResponse = await axios.get('http://127.0.0.1:5000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Profile fetch successful:', profileResponse.data);

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testBackend();
