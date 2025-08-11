const io = require('socket.io-client');

// Test participant joining functionality
async function testParticipantJoining() {
  console.log('🧪 Testing participant joining functionality...');
  
  // Test 1: Basic connection
  console.log('\n📡 Test 1: Basic socket connection');
  const socket1 = io('http://localhost:8000');
  
  socket1.on('connect', () => {
    console.log('✅ Socket 1 connected:', socket1.id);
    
    // Test 2: Join room
    console.log('\n🏠 Test 2: Joining room');
    socket1.emit('join-room', { 
      roomId: 'test-room-123', 
      user: { name: 'Test User 1', photo: '' }
    });
  });
  
  socket1.on('all-users', (users) => {
    console.log('📋 All users received:', users);
  });
  
  socket1.on('participants', (participants) => {
    console.log('👥 Participants updated:', participants);
  });
  
  // Test 3: Second user joins
  setTimeout(() => {
    console.log('\n👤 Test 3: Second user joining');
    const socket2 = io('http://localhost:8000');
    
    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected:', socket2.id);
      
      socket2.emit('join-room', { 
        roomId: 'test-room-123', 
        user: { name: 'Test User 2', photo: '' }
      });
    });
    
    socket2.on('all-users', (users) => {
      console.log('📋 All users received by user 2:', users);
    });
    
    socket2.on('participants', (participants) => {
      console.log('👥 Participants updated for user 2:', participants);
    });
    
    // Test 4: Check if both users see each other
    setTimeout(() => {
      console.log('\n🔍 Test 4: Verifying both users can see each other');
      console.log('User 1 participants:', socket1.rooms);
      console.log('User 2 participants:', socket2.rooms);
      
      // Cleanup
      socket1.disconnect();
      socket2.disconnect();
      console.log('\n🧹 Test completed, connections closed');
      process.exit(0);
    }, 2000);
    
  }, 2000);
  
  // Error handling
  socket1.on('connect_error', (error) => {
    console.error('❌ Socket 1 connection error:', error);
  });
  
  socket1.on('error', (error) => {
    console.error('❌ Socket 1 error:', error);
  });
}

// Run the test
testParticipantJoining().catch(console.error);
