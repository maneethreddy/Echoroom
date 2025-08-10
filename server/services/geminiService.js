const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    
    if (this.apiKey) {
      this.initialize();
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
    }
  }

  initialize() {
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      console.log('✅ Gemini AI service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Gemini AI service:', error);
    }
  }

  async generateResponse(prompt, context = '') {
    if (!this.model) {
      return {
        success: false,
        error: 'Gemini AI service not initialized',
        message: 'AI assistant is currently unavailable. Please try again later.'
      };
    }

    try {
      // Build context-aware prompt
      const fullPrompt = context 
        ? `Context: ${context}\n\nUser Question: ${prompt}\n\nPlease provide a helpful and relevant response.`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: text,
        model: 'gemini-pro',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Gemini AI error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an error while processing your request. Please try again.'
      };
    }
  }

  async chatResponse(message, conversationHistory = []) {
    if (!this.model) {
      return {
        success: false,
        error: 'Gemini AI service not initialized',
        message: 'AI assistant is currently unavailable. Please try again later.'
      };
    }

    try {
      // Create chat session
      const chat = this.model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role,
          parts: msg.parts
        })),
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: text,
        model: 'gemini-pro',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Gemini AI chat error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an error while processing your request. Please try again.'
      };
    }
  }

  async analyzeMessage(message, roomContext = '') {
    if (!this.model) {
      return {
        success: false,
        error: 'Gemini AI service not initialized'
      };
    }

    try {
      const prompt = `Analyze this message in the context of a video chat room: "${message}"
      
      Room Context: ${roomContext}
      
      Please provide:
      1. Sentiment analysis (positive, negative, neutral)
      2. Key topics mentioned
      3. Whether this message might need moderation
      4. Suggested response if it's a question
      
      Format as JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON response
      try {
        const analysis = JSON.parse(text);
        return {
          success: true,
          analysis,
          timestamp: new Date()
        };
      } catch (parseError) {
        return {
          success: true,
          analysis: { rawResponse: text },
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error('❌ Gemini AI analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  isAvailable() {
    return !!this.model;
  }

  getStatus() {
    return {
      available: this.isAvailable(),
      model: this.model ? 'gemini-pro' : null,
      timestamp: new Date()
    };
  }
}

module.exports = new GeminiService(); 