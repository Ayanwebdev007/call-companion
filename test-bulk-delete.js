const axios = require('axios');

// Test the bulk delete endpoint
async function testBulkDelete() {
  try {
    // First, let's get a token by logging in
    const loginResponse = await axios.post('https://call-companion-backend.onrender.com/api/auth/login', {
      username: 'testuser',
      password: 'testpass'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Now test bulk delete with some fake IDs
    const deleteResponse = await axios.delete('https://call-companion-backend.onrender.com/api/customers/bulk-delete', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        ids: ['fake-id-1', 'fake-id-2']
      }
    });
    
    console.log('Bulk delete response:', deleteResponse.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testBulkDelete();