const axios = require('axios');

const BACKEND_URL = 'http://localhost:5030';
const AI_URL = 'http://localhost:5000';

async function main() {
  console.log('=== TEST 1: Summary Generation Endpoint ===');
  const summaryRes = await axios.post(`${AI_URL}/generate-summary`, {
    location: '123 Main St, Springfield',
    damageType: 'Pothole',
    severity: 'High',
    priority: 'High'
  });

  console.log('Summary Type:', summaryRes.data.summary_type);
  console.log('Summary Result:\n', summaryRes.data.summary);

  console.log('\n=== TEST 2: Admin AI Chat Endpoint ===');
  // Login owner
  const ownerRes = await axios.post(`${BACKEND_URL}/api/admin/auth/login`, {
    email: 'owner@safestreets.com',
    password: 'ownerpassword123'
  });
  const ownerToken = ownerRes.data.token;

  // Create chat with initialMessage
  const userMessage = 'What are the recommended municipal repair protocols for severe asphalt potholes?';
  console.log('Creating Admin AI Chat with initial message:', userMessage);

  try {
    const createChatRes = await axios.post(`${BACKEND_URL}/api/admin/ai-chat/chats`, {
      initialMessage: userMessage
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const chat = createChatRes.data.chat || createChatRes.data;
    console.log('Created Admin AI Chat with ID:', chat._id);
    console.log('\nAdmin AI Chat Response:');
    console.log(createChatRes.data.aiResponse || chat.messages?.[1]?.content);
  } catch (chatErr) {
    if (chatErr.response?.data) {
      console.log('Admin AI Chat response (expected if API key not yet set in .env):', chatErr.response.data);
    } else {
      console.error('Chat error:', chatErr.message);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message || err);
  process.exit(1);
});
