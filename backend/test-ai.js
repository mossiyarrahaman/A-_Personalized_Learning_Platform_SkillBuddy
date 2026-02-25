require('dotenv').config();
const aiService = require('./services/ai-service');

async function test() {
  console.log("Testing AI Service...");
  try {
    const questions = await aiService.generateAssessmentQuestions('Frontend Development', 'Beginner', 5);
    console.log("Result:", JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error("Test Failed:", error);
  }
}

test();