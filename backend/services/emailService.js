import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure email transporter - FIXED TYPO: createTransport NOT createTransport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Test transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});
// Add this function to email.js
const sendInvoiceEmail = async (recipientEmail, invoice, pdfPath) => {
  try {
    console.log(`📧 Sending invoice email to: ${recipientEmail}`);
    console.log(`📧 Invoice details:`, {
      invoice_number: invoice.invoice_number,
      wholesaler_email: invoice.wholesaler_email,
      manufacturer: invoice.manufacturer_business_name
    });
    
    // Check email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email credentials missing in .env');
      throw new Error('Email service not configured');
    }
    
    const mailOptions = {
      from: `"MediVerse Invoices" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `📄 Invoice #${invoice.invoice_number} Approved - ${invoice.manufacturer_business_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>📄 Invoice Approved</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Dear ${invoice.wholesaler_business_name || 'Customer'},</h2>
            
            <p>Your invoice has been approved by <strong>${invoice.manufacturer_business_name}</strong>.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${parseFloat(invoice.total_amount).toFixed(2)}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Approved</span></p>
            </div>
            
            <p>The PDF invoice is attached to this email for your records.</p>
            
            <p>You can also view this invoice in your MediVerse dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/dashboard/invoices" 
                 style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">
                View Invoice in Dashboard
              </a>
            </div>
            
            <p>For any questions regarding this invoice, please contact the manufacturer directly.</p>
            
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
              <p>© ${new Date().getFullYear()} MediVerse. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename: `Invoice_${invoice.invoice_number}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf'
      }]
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent successfully to ${recipientEmail}:`, info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    console.error('❌ Error details:', {
      recipient: recipientEmail,
      invoiceId: invoice.id,
      error: error.message
    });
    throw error;
  }
};


const sendAcceptanceEmail = async (order) => {
  try {
    const wholesalerEmail = order.wholesaler_email || (order.wholesaler_id && order.wholesaler_id.email);
    const wholesalerName = order.wholesaler_businessName || (order.wholesaler_id && order.wholesaler_id.businessName);
    const manufacturerName = order.manufacturer_businessName || (order.manufacturer_id && order.manufacturer_id.businessName);

    console.log('📧 Sending acceptance email for order:', order.order_id);
    
    // Actually send the email now
    const mailOptions = {
      from: `"MediVerse" <${process.env.EMAIL_USER || 'noreply@mediverse.com'}>`,
      to: wholesalerEmail,
      subject: `✅ Order Accepted - Order #${order.order_id} - ${manufacturerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #10b981; text-align: center;">Order Accepted!</h2>
          <h3>Dear ${wholesalerName},</h3>
          <p>Your order <strong>#${order.order_id}</strong> has been accepted by <strong>${manufacturerName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Details:</strong></p>
            <p>Order ID: ${order.order_id}</p>
            <p>Status: <span style="color: #10b981; font-weight: bold;">Accepted</span></p>
            <p>Medicine: ${order.medicine_name || 'N/A'}</p>
            <p>Quantity: ${order.quantity}</p>
            <p>Amount: ₹${order.total_amount || '0.00'}</p>
          </div>
          
          <p>The manufacturer will now proceed with processing your order.</p>
          
          <p style="color: #666; font-size: 14px;">
            You can track your order status from your dashboard.<br>
            Thank you for using MediVerse!
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} MediVerse. All rights reserved.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Acceptance email sent to ${wholesalerEmail}:`, info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Error in sendAcceptanceEmail:', error);
    throw error;
  }
};

const sendRejectionEmail = async (order, rejectionReason = '') => {
  try {
    const wholesalerEmail = order.wholesaler_email || (order.wholesaler_id && order.wholesaler_id.email);
    const wholesalerName = order.wholesaler_businessName || (order.wholesaler_id && order.wholesaler_id.businessName);
    const manufacturerName = order.manufacturer_businessName || (order.manufacturer_id && order.manufacturer_id.businessName);

    console.log('📧 Sending rejection email for order:', order.order_id);
    
    const mailOptions = {
      from: `"MediVerse" <${process.env.EMAIL_USER || 'noreply@mediverse.com'}>`,
      to: wholesalerEmail,
      subject: `❌ Order Rejected - Order #${order.order_id} - ${manufacturerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #ef4444; text-align: center;">Order Rejected</h2>
          <h3>Dear ${wholesalerName},</h3>
          <p>Your order <strong>#${order.order_id}</strong> has been rejected by <strong>${manufacturerName}</strong>.</p>
          
          ${rejectionReason ? `
          <div style="background-color: #fee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Reason for rejection:</strong></p>
            <p>${rejectionReason}</p>
          </div>
          ` : ''}
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Details:</strong></p>
            <p>Order ID: ${order.order_id}</p>
            <p>Status: <span style="color: #ef4444; font-weight: bold;">Rejected</span></p>
            <p>Medicine: ${order.medicine_name || 'N/A'}</p>
            <p>Quantity: ${order.quantity}</p>
            <p>Amount: ₹${order.total_amount || '0.00'}</p>
          </div>
          
          <p>You may contact the manufacturer directly for more information or place a new order.</p>
          
          <p style="color: #666; font-size: 14px;">
            Please visit your dashboard for alternative options.<br>
            We apologize for any inconvenience.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} MediVerse. All rights reserved.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Rejection email sent to ${wholesalerEmail}:`, info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Error in sendRejectionEmail:', error);
    throw error;
  }
};

const sendOrderEmail = async (email, type, data) => {
  try {
    console.log(`📧 Sending ${type} email to: ${email}`);
    
    let subject, html;
    
    switch(type) {
      case 'shipped':
        subject = `🚚 Order Shipped - Order #${data.order_id}`;
        html = `<h2>Your order has been shipped!</h2><p>Order #${data.order_id} is on its way.</p>`;
        break;
      case 'delivered':
        subject = `📦 Order Delivered - Order #${data.order_id}`;
        html = `<h2>Your order has been delivered!</h2><p>Order #${data.order_id} has been delivered successfully.</p>`;
        break;
      default:
        subject = `MediVerse Order Update - Order #${data.order_id}`;
        html = `<h2>Order Update</h2><p>Your order #${data.order_id} status has been updated.</p>`;
    }
    
    const mailOptions = {
      from: `"MediVerse" <${process.env.EMAIL_USER || 'noreply@mediverse.com'}>`,
      to: email,
      subject: subject,
      html: html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type} email sent to ${email}:`, info.messageId);
    return info;

  } catch (error) {
    console.error(`❌ Error sending ${type} email:`, error);
    throw error;
  }
};

const sendOtpEmail = async (email, otp, businessName) => {
  try {
    console.log(`📧 Sending OTP ${otp} to ${email} for ${businessName}`);
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email credentials not configured in environment variables');
      throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }
    
    const mailOptions = {
      from: `"MediVerse" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🔐 MediVerse Email Verification OTP - ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">MediVerse Email Verification</h2>
          <h3 style="color: #333;">Hello ${businessName},</h3>
          <p>Your One-Time Password (OTP) for email verification is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; margin: 20px 0; border-radius: 5px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">
            This OTP is valid for <strong>5 minutes</strong> only.<br>
            Please enter this code on the verification page to complete your registration.
          </p>
          <p style="color: #999; font-size: 12px;">
            <strong>Important:</strong> If you didn't request this OTP, please ignore this email or contact support immediately.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} MediVerse. All rights reserved.<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}:`, info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

export {
  sendAcceptanceEmail,
  sendRejectionEmail,
  sendOrderEmail,
  sendOtpEmail,
  sendInvoiceEmail, 
  transporter
};