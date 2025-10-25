import nodemailer from "nodemailer";

// 🔹 Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hariniandal2005@gmail.com",     // replace with your Gmail
    pass: "mbpt vjlh dgtn zbui",        // App password (not your real Gmail password)
  },
});

// 🔹 Send OTP Email Function
export const sendOtpEmail = async (to, otp, businessName) => {
  const mailOptions = {
    from: "hariniandal2005@gmail.com",
    to,
    subject: "Company Verification OTP - MediCare Chain",
    text: `
Hi ${businessName || "User"},

Your One-Time Password (OTP) for company verification is: ${otp}

This OTP is valid for 5 minutes only.

If you didn’t request this, please ignore this message.

Best regards,
MediCare Chain Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${to}`);
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    throw new Error("Email sending failed");
  }
};
