import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: "hariniandal2005@gmail.com",
    pass: "mbpt vjlh dgtn zbui",
  },
});

// Email templates
const emailTemplates = {
  newOrder: (orderData) => ({
    subject: `🚀 New Order Received - ${orderData.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: white; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📦 New Order Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderData.orderId}</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #8b5cf6; margin-top: 0;">Order Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="color: #cbd5e1;">Order ID:</strong>
                <p style="margin: 5px 0; color: white;">${orderData.orderId}</p>
              </div>
              <div>
                <strong style="color: #cbd5e1;">Wholesaler:</strong>
                <p style="margin: 5px 0; color: white;">${orderData.wholesalerName}</p>
              </div>
              <div>
                <strong style="color: #cbd5e1;">Product:</strong>
                <p style="margin: 5px 0; color: white;">${orderData.productName}</p>
              </div>
              <div>
                <strong style="color: #cbd5e1;">Quantity:</strong>
                <p style="margin: 5px 0; color: white;">${orderData.quantity} units</p>
              </div>
              <div>
                <strong style="color: #cbd5e1;">Total Amount:</strong>
                <p style="margin: 5px 0; color: #10b981; font-weight: bold;">$${orderData.totalAmount}</p>
              </div>
              <div>
                <strong style="color: #cbd5e1;">Order Date:</strong>
                <p style="margin: 5px 0; color: white;">${orderData.orderDate}</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5173/manufacturer/dashboard" 
               style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold;
                      display: inline-block;">
              📊 View Order in Dashboard
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; text-align: center;">
            <p style="color: #94a3b8; font-size: 14px;">
              This is an automated notification from Pharma Supply Chain System
            </p>
          </div>
        </div>
      </div>
    `
  })
};

// Send order notification email
export const sendOrderEmail = async (to, templateName, data) => {
  try {
    const template = emailTemplates[templateName](data);
    
    const mailOptions = {
      from: "Pharma Supply Chain <hariniandal2005@gmail.com>",
      to: to,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Order email sent to ${to}`);
    return result;
  } catch (error) {
    console.error('❌ Order email sending failed:', error);
    throw error;
  }
};

// OTP Email function (keep your existing)
export const sendOtpEmail = async (to, otp, businessName) => {
  const mailOptions = {
    from: "hariniandal2005@gmail.com",
    to,
    subject: "Company Verification OTP - MediCare Chain",
    text: `
Hi ${businessName || "User"},

Your One-Time Password (OTP) for company verification is: ${otp}

This OTP is valid for 5 minutes only.

If you didn't request this, please ignore this message.

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