require('dotenv').config();
const aiService = require('./services/ai-service');

async function test() {
    console.log("Testing AI Service...");
    try {
        const questions = await aiService.generateAssessmentQuestions('Frontend Development', 'Beginner', 5);
        console.log("Result:", JSON.stringify(questions, null, 2));
    } catch (error) {
        console.log("Test Failed (CAUGHT):", error.message);
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", JSON.stringify(error.response.data));
        }
    }
}

test();
