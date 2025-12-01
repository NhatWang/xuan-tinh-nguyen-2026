const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"XTN 2026" <no-reply@xtn.com>`,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT TO:", to);

  } catch (err) {
    console.error("EMAIL SEND ERROR:", err);
    throw err;
  }
};

module.exports = sendEmail;
