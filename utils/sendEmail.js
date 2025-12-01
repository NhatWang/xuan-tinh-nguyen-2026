const axios = require("axios");

async function sendEmail(to, subject, html) {
  try {
    const response = await axios.post(
      "https://send.api.mailtrap.io/api/send",
      {
        from: {
          email: process.env.FROM_EMAIL,
          name: "XTN 2026"
        },
        to: [
          {
            email: to
          }
        ],
        subject,
        html
      },
      {
        headers: {
          "Api-Token": process.env.MAILTRAP_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("EMAIL SENT:", response.data);
  } catch (err) {
    console.error("MAILTRAP API ERROR:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = sendEmail;
