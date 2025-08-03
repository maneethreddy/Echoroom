const jwt = require('jsonwebtoken');

console.log('🔍 Verifying Token Authentication Fix');
console.log('=====================================');

// Test the same JWT secret that the server uses
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here_make_it_long_and_random";

// Create a test token
const testUser = { id: 'test123', name: 'Test User' };
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

console.log('✅ JWT token created successfully');
console.log('📋 Token preview:', token.substring(0, 50) + '...');

// Test token verification
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verification working');
  console.log('📅 Token expires:', new Date(decoded.exp * 1000).toLocaleString());
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

console.log('');
console.log('🔧 Next Steps:');
console.log('1. Start the server: cd server && npm run dev');
console.log('2. Start the client: cd client && npm start');
console.log('3. Login to get a fresh token');
console.log('4. Try scheduling a meeting');
console.log('');
console.log('📖 If you still have issues, run: ./fix-token-issue.sh'); 