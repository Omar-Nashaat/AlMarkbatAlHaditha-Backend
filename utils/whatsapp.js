const axios = require('axios');
require('dotenv').config();

/**
 * Sends a WhatsApp message via UltraMsg API
 * @param {string} to - Recipient phone number
 * @param {string} message - The message content to send
 */
async function sendWhatsAppMessage(to, message) {
    try {
        const data = new URLSearchParams({
            "token": process.env.ULTRAMSG_API_TOKEN,  // Secure Token
            "to": to,  // Customer's WhatsApp number
            "body": message  // Custom message
        });

        const config = {
            method: 'post',
            url: `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        const response = await axios(config);
        console.log("WhatsApp Message Sent:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { sendWhatsAppMessage };
