const axios = require("axios");

async function sendEmail(to, subject, html) {
  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: process.env.FROM_EMAIL,
        to: [to],
        subject,
        html
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("RESEND SUCCESS:", response.data);
  } catch (error) {
    console.error("RESEND ERROR:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendEmail;
