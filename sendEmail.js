const nodemailer = require("nodemailer");

const sendEmail = async (emails, link) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🚀 Send all emails in parallel (FAST)
    await Promise.all(
      emails.map((email) =>
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "🌍 Tour Group Invitation",
          text: `You are invited to join the tour group.\n\nClick here to join:\n${link}${email}`,
        })
      )
    );

    console.log("✅ All invitation emails sent successfully");

  } catch (error) {
    console.log("❌ Email sending error:", error);
  }
};

module.exports = sendEmail;