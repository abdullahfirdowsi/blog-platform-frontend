// Test script to verify frontend-backend alignment
const apiUrl = 'http://127.0.0.1:8000/api/v1';

async function testBackendConnection() {
  console.log('Testing backend connection...');
  
  try {
    // Test 1: Root endpoint
    const rootResponse = await fetch('http://127.0.0.1:8000/');
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData);
    
    // Test 2: Posts endpoint (should be public for published posts)
    const postsResponse = await fetch(`${apiUrl}/posts`);
    console.log('Posts endpoint status:', postsResponse.status);
    
    if (postsResponse.ok) {
      const postsData = await postsResponse.json();
      console.log('✅ Posts endpoint:', postsData);
    } else {
      console.log('❌ Posts endpoint failed:', await postsResponse.text());
    }
    
    // Test 3: Test login endpoint structure
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log('Login endpoint status:', loginResponse.status);
    console.log('Login endpoint response:', await loginResponse.text());
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testBackendConnection();

