const jwt = require('jsonwebtoken');

// Test JWT token creation and verification
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here_make_it_long_and_random";

console.log('🔐 Testing JWT Authentication');
console.log('=============================');

// Test token creation
const testUser = { id: 'test123', name: 'Test User' };
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

console.log('✅ Token created:', token.substring(0, 50) + '...');

// Test token verification
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verified successfully');
  console.log('📋 Decoded payload:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

// Test expired token
const expiredToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1s' });
console.log('⏰ Created token that expires in 1 second');

setTimeout(() => {
  try {
    const decoded = jwt.verify(expiredToken, JWT_SECRET);
    console.log('❌ Expired token should not be valid');
  } catch (error) {
    console.log('✅ Expired token correctly rejected:', error.message);
  }
}, 2000);

console.log('\n🔧 To test with your server:');
console.log('1. Start your server: cd server && npm run dev');
console.log('2. Test the auth endpoint: curl http://localhost:8000/api/auth/test');
console.log('3. Test token endpoint: curl http://localhost:8000/api/meetings/test-auth'); 