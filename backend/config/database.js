// config/database.js - Combined file with both database and email
import mysql from 'mysql2';
import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import fs from 'fs';

dotenv.config();

// ============ DATABASE CONNECTION ============
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scm_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export database as default
const db = pool.promise();
export default db;

// ============ EMAIL CONFIGURATION ============
// FIX: createTransport NOT createTransport (you had a typo)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "hariniandal2005@gmail.com",
    pass: process.env.EMAIL_PASS || "mbpt vjlh dgtn zbui",
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
  }),
  
  // Add invoice email template
  invoice: (invoiceData) => ({
    subject: `📄 Invoice ${invoiceData.invoice_number} - ${invoiceData.manufacturer_business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Invoice ${invoiceData.invoice_number}</h1>
          <p>From: ${invoiceData.manufacturer_business_name}</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Dear ${invoiceData.wholesaler_business_name},</p>
          
          <p>Please find attached your invoice <strong>${invoiceData.invoice_number}</strong> 
             from ${invoiceData.manufacturer_business_name}.</p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #4F46E5;">Invoice Summary</h3>
            <p><strong>Invoice Number:</strong> ${invoiceData.invoice_number}</p>
            <p><strong>Invoice Date:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${parseFloat(invoiceData.total_amount).toFixed(2)}</p>
          </div>
          
          <p>You can also view and manage this invoice in your MediVerse dashboard.</p>
          
          <p>Best regards,<br>
          <strong>${invoiceData.manufacturer_business_name}</strong><br>
          MediVerse Platform</p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>This email was sent automatically from the MediVerse platform.</p>
          <p>© ${new Date().getFullYear()} MediVerse. All rights reserved.</p>
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
      from: process.env.EMAIL_FROM || "Pharma Supply Chain <hariniandal2005@gmail.com>",
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

// Send invoice email

export const sendInvoiceEmail = async (to, invoiceData, pdfPath) => {
  try {
    const template = emailTemplates.invoice(invoiceData);
    
    // Prepare attachments
    const attachments = [];
    
    if (pdfPath && fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `invoice_${invoiceData.invoice_number}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf'
      });
    } else {
      console.warn(`⚠️ PDF file not found at: ${pdfPath}`);
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "MediVerse <hariniandal2005@gmail.com>",
      to: to,
      subject: template.subject,
      html: template.html,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent to ${to} with ${attachments.length} attachment(s)`);
    return info;
  } catch (error) {
    console.error('❌ Invoice email sending failed:', error);
    throw error;
  }
};

// OTP Email function
export const sendOtpEmail = async (to, otp, businessName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "hariniandal2005@gmail.com",
    to,
    subject: "Company Verification OTP - Mediverse",
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

// Also export the transporter if needed elsewhere
export { transporter };
