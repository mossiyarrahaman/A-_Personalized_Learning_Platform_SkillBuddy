require('dotenv').config();
const { sendOTPEmail } = require('./services/email-service');

async function testEmail() {
    console.log("Testing Email Sending...");
    try {
        // Use the email from .env or a dummy one for testing if not set
        const testRecipient = process.env.EMAIL_USER;
        console.log(`Sending test email to self: ${testRecipient}`);

        await sendOTPEmail(testRecipient, '123456');
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Email Test Failed:", error);
    }
}

testEmail();
