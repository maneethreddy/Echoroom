const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test the Gemini API connection
async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API connection...');
  
  // Check if API key is set
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment variables');
    console.log('Please set GEMINI_API_KEY in your .env file');
    return false;
  }
  
  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Test with a simple prompt
    const prompt = "Hello! Please respond with 'AI Assistant is working correctly' if you can see this message.";
    
    console.log('📤 Sending test prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('✅ Gemini API Response:', response);
    console.log('🎉 AI Assistant service is ready!');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing Gemini API:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 Please check your GEMINI_API_KEY is correct');
    } else if (error.message.includes('quota')) {
      console.log('💡 You may have exceeded your API quota');
    } else if (error.message.includes('network')) {
      console.log('💡 Please check your internet connection');
    }
    
    return false;
  }
}

// Test the AI Assistant service
async function testAIAssistantService() {
  console.log('\n🧪 Testing AI Assistant service...');
  
  try {
    // Import the AI Assistant service
    const aiAssistant = require('./server/services/aiAssistant');
    
    // Test meeting context creation
    const roomId = 'test-room-' + Date.now();
    const context = aiAssistant.getMeetingContext(roomId);
    
    console.log('✅ Meeting context created:', {
      roomId,
      participants: context.participants.length,
      messages: context.messages.length,
      startTime: context.startTime
    });
    
    // Test adding a participant
    aiAssistant.addParticipant(roomId, { id: 'user1', name: 'Test User' });
    
    // Test adding a message
    aiAssistant.addMessage(roomId, { sender: 'Test User', text: 'Hello, this is a test message!' });
    
    // Test getting updated context
    const updatedContext = aiAssistant.getMeetingContext(roomId);
    console.log('✅ Context updated:', {
      participants: updatedContext.participants.length,
      messages: updatedContext.messages.length
    });
    
    // Test clearing context
    aiAssistant.clearMeetingContext(roomId);
    console.log('✅ Context cleared successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing AI Assistant service:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting AI Assistant Tests...\n');
  
  const geminiTest = await testGeminiAPI();
  const serviceTest = await testAIAssistantService();
  
  console.log('\n📊 Test Results:');
  console.log(`Gemini API: ${geminiTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Service: ${serviceTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (geminiTest && serviceTest) {
    console.log('\n🎉 All tests passed! AI Assistant is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: cd server && npm run dev');
    console.log('2. Start the client: cd client && npm start');
    console.log('3. Join a meeting and click the AI Assistant button (🤖)');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the setup instructions.');
    console.log('📖 See AI_ASSISTANT_SETUP.md for detailed setup guide.');
  }
}

// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (error) {
  console.log('ℹ️ No .env file found, using environment variables');
}

// Run the tests
runTests().catch(console.error); 