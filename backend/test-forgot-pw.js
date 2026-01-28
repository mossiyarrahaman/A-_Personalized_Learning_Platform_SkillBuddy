const axios = require('axios');

async function testForgotPassword() {
    try {
        console.log("Testing Forgot Password with non-existent email...");
        await axios.post('http://localhost:5000/api/auth/forgot-password', {
            email: 'nonexistent@example.com'
        });
    } catch (error) {
        if (error.response) {
            console.log(`Response Status: ${error.response.status}`);
            console.log(`Response Data:`, error.response.data);
        } else {
            console.error("Error:", error.message);
        }
    }
}

testForgotPassword();
