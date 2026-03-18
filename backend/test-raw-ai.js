require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const models = ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.5-flash:free', 'qwen/qwen-2.5-coder-32b-instruct:free', 'google/gemini-2.0-flash-lite-preview-02-05:free', 'deepseek/deepseek-chat:free'];

async function test() {
    let result = '';
    for (const model of models) {
        result += `TESTING: ${model}\n`;
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: model,
                    messages: [{ role: 'user', content: 'hello' }]
                },
                {
                    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
                }
            );
            result += `SUCCESS: ${model}\n`;
            fs.writeFileSync('output.txt', result);
            return;
        } catch (e) {
            result += `FAILED: ${model} ${e.response?.status} error: ${e.response?.data?.error?.message}\n`;
        }
    }
    fs.writeFileSync('output.txt', result);
}
test();
