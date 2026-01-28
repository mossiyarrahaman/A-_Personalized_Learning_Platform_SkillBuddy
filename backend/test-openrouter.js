const fetch = require('node-fetch');
require('dotenv').config();

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter Connection...\n');

  // Check if API key exists
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in .env file');
    console.log('   Add this to your .env:');
    console.log('   OPENROUTER_API_KEY=sk-or-v1-your-key-here');
    return;
  }

  console.log('✅ API Key found');
  console.log(`   Model: ${process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'}`);
  console.log('   Testing connection...\n');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.SITE_NAME || 'SkillBuddy',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          {
            role: 'user',
            content: 'Say "OpenRouter is working!" if you can read this.'
          }
        ],
        max_tokens: 50
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenRouter API Error:');
      console.error('   Status:', response.status);
      console.error('   Error:', errorData.error?.message || JSON.stringify(errorData));
      return;
    }

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      console.log('✅ OpenRouter Response:');
      console.log('   ' + data.choices[0].message.content);
      console.log('\n✅ Connection successful!');
      console.log('   Your backend is ready to use OpenRouter! 🚀');
    } else {
      console.error('❌ Unexpected response format:', JSON.stringify(data));
    }

  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('   Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   Possible issue: No internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Possible issue: OpenRouter API is unreachable');
    }
  }
}

testOpenRouter();