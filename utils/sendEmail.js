const axios = require("axios");

async function sendEmail(to, subject, html) {
  try {
    const response = await axios.post(
      "https://send.api.mailtrap.io/api/send",
      {
        from: {
          email: process.env.FROM_EMAIL,
          name: "Chiến dịch Xuân tình nguyện 2026 khoa Hóa học"
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        html: html
      },
      {
        headers: {
          "Api-Token": process.env.MAILTRAP_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("MAILTRAP SUCCESS:", response.data);
  } catch (error) {
    console.error("MAILTRAP ERROR:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendEmail;
