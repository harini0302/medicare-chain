import nodemailer from 'nodemailer';
import invoiceService from './invoiceService.js';

// Configure email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendAcceptanceEmail = async (order) => {
  try {
    const wholesalerEmail = order.wholesaler_email || (order.wholesaler_id && order.wholesaler_id.email);
    const wholesalerName = order.wholesaler_businessName || (order.wholesaler_id && order.wholesaler_id.businessName);
    const manufacturerName = order.manufacturer_businessName || (order.manufacturer_id && order.manufacturer_id.businessName);

    console.log('📧 Sending acceptance email for order:', order.order_id);
    
    // For now, just log the email instead of actually sending it
    console.log(`Would send acceptance email to: ${wholesalerEmail}`);
    console.log(`Subject: Order Accepted - Order #${order.order_id} - ${manufacturerName}`);
    
    return Promise.resolve();

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
    console.log(`Would send rejection email to: ${wholesalerEmail}`);
    console.log(`Reason: ${rejectionReason}`);
    
    return Promise.resolve();

  } catch (error) {
    console.error('❌ Error in sendRejectionEmail:', error);
    throw error;
  }
};

const sendOrderEmail = async (email, type, data) => {
  try {
    console.log(`📧 Sending ${type} email to: ${email}`);
    console.log('Email data:', data);
    
    return Promise.resolve();

  } catch (error) {
    console.error(`❌ Error sending ${type} email:`, error);
    throw error;
  }
};

const sendOtpEmail = async (email, otp, businessName) => {
  try {
    console.log(`📧 Sending OTP ${otp} to ${email} for ${businessName}`);
    
    return Promise.resolve();

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw error;
  }
};

// Export as ES modules
export {
  sendAcceptanceEmail,
  sendRejectionEmail,
  sendOrderEmail,
  sendOtpEmail,
  transporter
};