const axios = require('axios');

async function testApi() {
    try {
        console.log("1. Testing Health Check...");
        const health = await axios.get('http://localhost:5000/');
        console.log("Health Check Status:", health.status);
        console.log("Health Check Data:", health.data);

        console.log("\n2. Testing Forgot Password (POST)...");
        try {
            const res = await axios.post('http://localhost:5000/api/auth/forgot-password', {
                email: 'nonexistent@example.com'
            });
            console.log("Success Response:", res.data);
        } catch (error) {
            if (error.response) {
                console.log(`Expected Error Status: ${error.response.status}`);
                console.log(`Expected Error Data:`, error.response.data);
            } else {
                console.error("Connection Error:", error.message);
            }
        }

    } catch (error) {
        console.error("Health Check Failed:", error.message);
    }
}

testApi();
