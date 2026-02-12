import express from 'express';
import db, { sendInvoiceEmail } from '../config/database.js';
import invoiceService from '../services/invoiceService.js'; // Correct path: ../services/invoiceService.js
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs'; // Add this import for file operations

// Get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

console.log('📁 Current directory:', __dirname);
console.log('📂 Checking for invoice service...');

// Debug: Check if service file exists
const servicePath = path.join(__dirname, '../services/invoiceService.js');
console.log('🔍 Looking for invoiceService at:', servicePath);
console.log('✅ File exists?', fs.existsSync(servicePath));

// Helper function to generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${random}`;
}

// 1. CREATE INVOICE (DRAFT)
router.post('/create', async (req, res) => {
  let connection;
  
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const {
      manufacturerId,
      wholesalerId,
      items,
      invoiceDate = new Date().toISOString().split('T')[0],
      dueDate,
      paymentTerms = "Payment due within 30 days",
      notes = ""
    } = req.body;
    
    // Validate inputs
    if (!manufacturerId || !wholesalerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Manufacturer, wholesaler, and items are required'
      });
    }
    
    // Get manufacturer details
    const [manufacturer] = await connection.execute(`
      SELECT u.*, cv.businessName, cv.businessAddress, cv.panGstNumber, cv.state, cv.email as company_email
      FROM users u
      LEFT JOIN company_verification cv ON u.email = cv.email
      WHERE u.id = ? AND u.role = 'manufacturer'
    `, [manufacturerId]);
    
    if (manufacturer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }
    
    // Get wholesaler details
    const [wholesaler] = await connection.execute(`
      SELECT u.*, cv.businessName, cv.businessAddress, cv.panGstNumber, cv.state, cv.email as company_email
      FROM users u
      LEFT JOIN company_verification cv ON u.email = cv.email
      WHERE u.id = ? AND u.role = 'wholesaler'
    `, [wholesalerId]);
    
    if (wholesaler.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Wholesaler not found'
      });
    }
    
    const man = manufacturer[0];
    const whole = wholesaler[0];
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    
    // Process items and calculate totals
    let subtotal = 0;
    let gstTotal = 0;
    const invoiceItems = [];
    
    for (const item of items) {
      const [products] = await connection.execute(`
        SELECT * FROM products 
        WHERE id = ? AND stock_qty >= ?
      `, [item.productId, item.quantity]);
      
      if (products.length === 0) {
        throw new Error(`Product ID ${item.productId} not found or insufficient stock`);
      }
      
      const product = products[0];
      
      // Calculate item values
      const itemSubtotal = item.quantity * product.unit_price;
      const taxRate = product.tax_rate || 18.00;
      const itemGST = itemSubtotal * (taxRate / 100);
      const itemTotal = itemSubtotal + itemGST;
      
      subtotal += itemSubtotal;
      gstTotal += itemGST;
      
      invoiceItems.push({
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        description: product.description,
        hsn_code: product.category,
        quantity: item.quantity,
        unit: product.unit || 'pcs',
        unit_price: product.unit_price,
        tax_rate: taxRate,
        subtotal: itemSubtotal,
        gst_amount: itemGST,
        total_amount: itemTotal,
        batch_number: item.batchNumber || ''
      });
    }
    
    const totalAmount = subtotal + gstTotal;
    
    // Calculate due date
    const calculatedDueDate = dueDate || 
      new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
    
    const placeOfSupply = whole.state || 'Not specified';
    
    // Insert invoice
    const [invoiceResult] = await connection.execute(`
      INSERT INTO invoices (
        invoice_number,
        manufacturer_id, wholesaler_id,
        manufacturer_business_name, manufacturer_address, manufacturer_gstin,
        manufacturer_email, manufacturer_phone,
        wholesaler_business_name, wholesaler_address, wholesaler_gstin,
        wholesaler_email, wholesaler_phone,
        invoice_date, due_date, place_of_supply,
        subtotal, gst_total, total_amount,
        payment_terms, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber,
      manufacturerId, wholesalerId,
      man.businessName || man.fullName, 
      man.businessAddress || 'Address not provided',
      man.panGstNumber || '',
      man.email,
      man.phoneNumber || '',
      whole.businessName || whole.fullName,
      whole.businessAddress || 'Address not provided',
      whole.panGstNumber || '',
      whole.email,
      whole.phoneNumber || '',
      invoiceDate,
      calculatedDueDate,
      placeOfSupply,
      subtotal,
      gstTotal,
      totalAmount,
      paymentTerms,
      notes,
      'draft'
    ]);
    
    const invoiceId = invoiceResult.insertId;
    
    // Insert invoice items
    for (const item of invoiceItems) {
      await connection.execute(`
        INSERT INTO invoice_items (
          invoice_id, product_id, sku, product_name, description,
          hsn_code, quantity, unit, unit_price, tax_rate,
          subtotal, gst_amount, total_amount, batch_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        item.product_id,
        item.sku,
        item.product_name,
        item.description,
        item.hsn_code,
        item.quantity,
        item.unit,
        parseFloat(item.unit_price),
        parseFloat(item.tax_rate),
        parseFloat(item.subtotal),
        parseFloat(item.gst_amount),
        parseFloat(item.total_amount),
        item.batch_number
      ]);
      
      // Update product stock
      await connection.execute(
        `UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully as draft',
      data: {
        invoiceId,
        invoiceNumber,
        totalAmount,
        status: 'draft'
      }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating invoice'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 2. APPROVE INVOICE AND GENERATE PDF USING INVOICE SERVICE
router.post('/:id/approve', async (req, res) => {
  let connection;
  try {
    console.log(`🔍 Approving invoice ID: ${req.params.id}`);
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const invoiceId = req.params.id;
    const { approvedBy } = req.body;
    
    // Get invoice details
    const [invoices] = await connection.execute(`
      SELECT 
        i.*,
        w.email as wholesaler_email,
        w.fullName as wholesaler_name,
        m.fullName as manufacturer_name
      FROM invoices i
      LEFT JOIN users w ON i.wholesaler_id = w.id
      LEFT JOIN users m ON i.manufacturer_id = m.id
      WHERE i.id = ? AND i.status = 'draft'
    `, [invoiceId]);
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found or not in draft status'
      });
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const [items] = await connection.execute(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `, [invoiceId]);
    
    // Prepare data for PDF generation using invoiceService
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      payment_type: 'Cash',
      manufacturer_business_name: invoice.manufacturer_business_name,
      manufacturer_gstin: invoice.manufacturer_gstin,
      manufacturer_address: invoice.manufacturer_address,
      manufacturer_email: invoice.manufacturer_email,
      manufacturer_phone: invoice.manufacturer_phone,
      wholesaler_business_name: invoice.wholesaler_business_name,
      wholesaler_gstin: invoice.wholesaler_gstin,
      wholesaler_address: invoice.wholesaler_address,
      wholesaler_email: invoice.wholesaler_email,
      wholesaler_phone: invoice.wholesaler_phone,
      subtotal: invoice.subtotal,
      gst_total: invoice.gst_total,
      total_amount: invoice.total_amount,
      tax_rate: invoice.tax_rate,
      notes: invoice.notes,
      place_of_supply: invoice.place_of_supply,
      items: items.map(item => ({
        product_name: item.product_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_percent: 0,
        batch_number: item.batch_number || '',
        subtotal: item.subtotal,
        gst_amount: item.gst_amount,
        total_amount: item.total_amount
      }))
    };
    
    console.log('📄 Generating PDF using invoiceService...');
    const pdfResult = await invoiceService.generateInvoicePDF(invoiceData);
    
    console.log(`✅ PDF generated: ${pdfResult.fileName}`);
    
    // Update invoice status and PDF path
    await connection.execute(`
      UPDATE invoices 
      SET 
        status = 'approved', 
        pdf_path = ?,
        is_sent = 1,
        sent_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [pdfResult.fileName, invoiceId]);
    
    // Send email
    let emailSent = false;
    if (invoice.wholesaler_email) {
      try {
        console.log(`📧 Sending email to: ${invoice.wholesaler_email}`);
        
        const invoiceForEmail = {
          ...invoice,
          wholesaler_name: invoice.wholesaler_name || invoice.wholesaler_business_name,
          manufacturer_name: invoice.manufacturer_name || invoice.manufacturer_business_name
        };
        
        await sendInvoiceEmail(invoice.wholesaler_email, invoiceForEmail, pdfResult.filePath);
        console.log(`✅ Email sent to: ${invoice.wholesaler_email}`);
        emailSent = true;
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
      }
    }
    
    // Create notification
    try {
      const notificationSql = `
        INSERT INTO notifications 
        (user_id, title, message, type, related_id, related_type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
      `;
      
      const notificationMessage = `Invoice #${invoice.invoice_number} has been approved by ${invoice.manufacturer_business_name}. Amount: ₹${parseFloat(invoice.total_amount).toFixed(2)}`;
      
      await connection.execute(notificationSql, [
        invoice.wholesaler_id,
        'Invoice Approved ✅',
        notificationMessage,
        'invoice_approved',
        invoice.id,
        'invoice',
        0
      ]);
      
      console.log(`📢 Notification created for wholesaler ID: ${invoice.wholesaler_id}`);
      
    } catch (notifError) {
      console.error('❌ Notification creation error:', notifError);
    }
    
    // Send socket notification
    try {
      const io = req.app.get('io');
      
      if (io && invoice.wholesaler_id) {
        console.log(`📡 Sending socket notification to wholesaler-${invoice.wholesaler_id}`);
        
        io.to(`wholesaler-${invoice.wholesaler_id}`).emit('invoiceUpdate', {
          type: 'invoice_approved',
          title: 'Invoice Approved ✅',
          message: `Invoice #${invoice.invoice_number} has been approved`,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          targetWholesalerId: invoice.wholesaler_id,
          amount: parseFloat(invoice.total_amount).toFixed(2),
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Socket notification sent to wholesaler-${invoice.wholesaler_id}`);
      }
    } catch (socketError) {
      console.error('❌ Socket notification error:', socketError);
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Invoice approved successfully',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        wholesalerEmail: invoice.wholesaler_email,
        totalAmount: invoice.total_amount,
        pdfUrl: `/api/invoices/download/${pdfResult.fileName}`,
        emailSent: emailSent,
        status: 'approved'
      }
    });
    
  } catch (error) {
    console.error('❌ Error approving invoice:', error);
    if (connection) await connection.rollback();
    res.status(500).json({
      success: false,
      message: error.message || 'Error approving invoice'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 3. GET MANUFACTURER'S PRODUCTS
router.get('/products/manufacturer/:manufacturerId', async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { search = '' } = req.query;
    
    let query = `
      SELECT p.id, p.sku, p.name, p.description, p.unit_price, 
             p.tax_rate, p.stock_qty, p.unit, p.expiry_date,
             p.category, p.status, p.image
      FROM products p
      WHERE (p.manufacturer_id = ? OR p.company_id = ?)
        AND p.status = 'Stock'
        AND p.stock_qty > 0
    `;
    
    const params = [manufacturerId, manufacturerId];
    
    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ` ORDER BY p.name LIMIT 50`;
    
    const [products] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});


// Reject order
router.post('/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rejectionReason, user_id } = req.body;
    
    console.log('❌ Rejecting order:', orderId);
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Get order details first
    const [orderRows] = await db.execute(
      'SELECT * FROM orders WHERE order_id = ? AND status = ?',
      [orderId, 'pending']
    );
    
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or already processed'
      });
    }
    
    const order = orderRows[0];
    
    // Update order status
    await db.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?',
      ['rejected', orderId]
    );
    
    // Create notification for wholesaler
    await db.execute(`
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_order_id,
        is_read,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      order.wholesaler_id,
      'order_rejected',
      'Order Rejected',
      `Your order #${orderId} has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
      orderId,
      0
    ]);
    
    // Send socket notification
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`wholesaler-${order.wholesaler_id}`).emit('orderUpdate', {
          orderId: orderId,
          status: 'rejected',
          message: `Your order has been rejected. Reason: ${rejectionReason || 'No reason provided'}`
        });
      }
    } catch (socketError) {
      console.log('⚠️ Socket notification failed:', socketError.message);
    }
    
    res.json({
      success: true,
      message: 'Order rejected successfully'
    });
    
  } catch (error) {
    console.error('❌ Error rejecting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Test email endpoint
router.post('/test-email/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { email } = req.body;
    
    console.log(`🧪 Testing email for wholesaler ${wholesalerId}`);
    
    // Get wholesaler email from database if not provided
    let recipientEmail = email;
    if (!recipientEmail) {
      const [wholesalerRows] = await db.execute(
        'SELECT email FROM users WHERE id = ? AND role = "wholesaler"',
        [wholesalerId]
      );
      
      if (wholesalerRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Wholesaler not found'
        });
      }
      
      recipientEmail = wholesalerRows[0].email;
    }
    
    console.log(`📧 Testing email to: ${recipientEmail}`);
    
    // Test email configuration
    console.log('🔧 Email configuration:', {
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });
    
    // Send test email
    const testInvoice = {
      id: 999,
      invoice_number: 'TEST-001',
      wholesaler_email: recipientEmail,
      wholesaler_business_name: 'Test Wholesaler',
      manufacturer_business_name: 'Test Manufacturer',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount: 1000.00
    };
    
    // Create a test PDF first
    const testData = {
      invoice_number: 'TEST-001',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      payment_type: 'Cash',
      manufacturer_business_name: 'Test Manufacturer',
      manufacturer_gstin: 'TESTGST123',
      manufacturer_address: 'Test Address',
      manufacturer_email: 'test@manufacturer.com',
      manufacturer_phone: '1234567890',
      wholesaler_business_name: 'Test Wholesaler',
      wholesaler_gstin: 'WHOLESALER456',
      wholesaler_address: 'Test Wholesaler Address',
      wholesaler_email: recipientEmail,
      wholesaler_phone: '9876543210',
      subtotal: 847.46,
      gst_total: 152.54,
      total_amount: 1000.00,
      tax_rate: 18,
      notes: 'Test invoice for email testing',
      place_of_supply: 'Test State',
      items: [{
        product_name: 'Test Product',
        description: 'Product for email testing',
        quantity: 10,
        unit_price: 84.75,
        tax_rate: 18,
        discount_percent: 0,
        subtotal: 847.46,
        gst_amount: 152.54,
        total_amount: 1000.00
      }]
    };
    
    const pdfResult = await invoiceService.generateInvoicePDF(testData);
    console.log(`✅ Test PDF created: ${pdfResult.filePath}`);
    
    // Send email
    const info = await sendInvoiceEmail(recipientEmail, testInvoice, pdfResult.filePath);
    
    console.log(`✅ Test email sent: ${info.messageId}`);
    
    res.json({
      success: true,
      message: `Test email sent to ${recipientEmail}`,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email test failed',
      error: error.message,
      details: {
        emailUser: process.env.EMAIL_USER ? 'Configured' : 'Not configured',
        emailPassword: process.env.EMAIL_PASSWORD ? 'Configured' : 'Not configured',
        smtpError: error.response || error.code
      }
    });
  }
});
// 5. GET SINGLE INVOICE
router.get('/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    const [invoices] = await db.execute(`
      SELECT i.* 
      FROM invoices i
      WHERE i.id = ?
    `, [invoiceId]);
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoice = invoices[0];
    
    const [items] = await db.execute(`
      SELECT ii.* 
      FROM invoice_items ii
      WHERE ii.invoice_id = ?
    `, [invoiceId]);
    
    invoice.items = items;
    
    res.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice'
    });
  }
});

// 6. DOWNLOAD INVOICE PDF
router.get('/:id/download', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    // Get invoice data
    const [invoices] = await db.execute(`
      SELECT i.* 
      FROM invoices i
      WHERE i.id = ?
    `, [invoiceId]);
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoice = invoices[0];
    
    // Check if PDF already exists
    if (invoice.pdf_path) {
      const pdfPath = path.join(__dirname, '../uploads/invoices', invoice.pdf_path);
      if (fs.existsSync(pdfPath)) {
        return res.download(pdfPath, `invoice_${invoice.invoice_number}.pdf`);
      }
    }
    
    // Get invoice items
    const [items] = await db.execute(`
      SELECT ii.* 
      FROM invoice_items ii
      WHERE ii.invoice_id = ?
    `, [invoiceId]);
    
    // Prepare data for PDF generation using invoiceService
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      payment_type: 'Cash',
      manufacturer_business_name: invoice.manufacturer_business_name,
      manufacturer_gstin: invoice.manufacturer_gstin,
      manufacturer_address: invoice.manufacturer_address,
      manufacturer_email: invoice.manufacturer_email,
      manufacturer_phone: invoice.manufacturer_phone,
      wholesaler_business_name: invoice.wholesaler_business_name,
      wholesaler_gstin: invoice.wholesaler_gstin,
      wholesaler_address: invoice.wholesaler_address,
      wholesaler_email: invoice.wholesaler_email,
      wholesaler_phone: invoice.wholesaler_phone,
      subtotal: invoice.subtotal,
      gst_total: invoice.gst_total,
      total_amount: invoice.total_amount,
      tax_rate: invoice.tax_rate,
      notes: invoice.notes,
      place_of_supply: invoice.place_of_supply,
      items: items.map(item => ({
        product_name: item.product_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_percent: 0,
        subtotal: item.subtotal,
        gst_amount: item.gst_amount,
        total_amount: item.total_amount
      }))
    };
    
    // Generate PDF using invoiceService
    const pdfResult = await invoiceService.generateInvoicePDF(invoiceData);
    
    // Update database with PDF path
    await db.execute(
      'UPDATE invoices SET pdf_path = ? WHERE id = ?',
      [pdfResult.fileName, invoiceId]
    );
    
    // Send file for download
    res.download(pdfResult.filePath, `invoice_${invoice.invoice_number}.pdf`);
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading invoice'
    });
  }
});

// 7. TEST SOCKET NOTIFICATION
router.post('/test-notification/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { message } = req.body;
    
    console.log(`🧪 Testing socket notification to wholesaler-${wholesalerId}`);
    
    const io = req.app.get('io');
    
    if (!io) {
      console.error('❌ Socket.io instance not available');
      return res.status(500).json({
        success: false,
        message: 'Socket.io not initialized'
      });
    }
    
    const roomName = `wholesaler-${wholesalerId}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    
    if (!room) {
      console.log(`⚠️ No socket connected for wholesaler-${wholesalerId}`);
      return res.json({
        success: false,
        message: `No active socket connection for wholesaler ${wholesalerId}`,
        suggestion: 'Make sure the wholesaler is logged in and connected'
      });
    }
    
    console.log(`✅ Found ${room.size} socket(s) in room: ${roomName}`);
    
    // Emit test notifications
    io.to(roomName).emit('invoiceUpdate', {
      type: 'test',
      title: 'Test Invoice Notification ✅',
      message: message || 'This is a test invoice notification from backend',
      invoiceId: 999,
      invoiceNumber: 'TEST-001',
      targetWholesalerId: parseInt(wholesalerId),
      amount: '1000.00',
      timestamp: new Date().toISOString()
    });
    
    io.to(roomName).emit('invoiceNotification', {
      type: 'test',
      title: 'Test Notification',
      message: 'Test socket connection is working',
      invoiceId: 999,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Test notifications sent to ${roomName}`);
    
    res.json({
      success: true,
      message: `Test notifications sent to wholesaler-${wholesalerId}`,
      roomSize: room.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 8. GET WHOLESALER INVOICES
router.get('/wholesaler/:wholesalerId', async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { status } = req.query;
    
    console.log(`📄 Fetching invoices for wholesaler ID: ${wholesalerId}`);
    
    let query = `
      SELECT i.* 
      FROM invoices i
      WHERE i.wholesaler_id = ?
    `;
    
    const params = [wholesalerId];
    
    if (status && status !== 'all') {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY i.created_at DESC`;
    
    const [invoices] = await db.execute(query, params);
    
    console.log(`✅ Found ${invoices.length} invoices for wholesaler ${wholesalerId}`);
    
    res.json({
      success: true,
      data: invoices
    });
    
  } catch (error) {
    console.error('Error fetching wholesaler invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices'
    });
  }
});

// 9. TEST PDF GENERATION WITH INVOICE SERVICE
router.get('/test/pdf', async (req, res) => {
  try {
    console.log('🧪 Testing PDF generation with invoiceService...');
    
    // Create test invoice data
    const testData = {
      invoice_number: `TEST-${Date.now()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      payment_type: 'Cash',
      manufacturer_business_name: 'pharma',
      manufacturer_gstin: 'GSTIN123456789',
      manufacturer_address: '123 Pharma Street, Madurai, Tamil Nadu',
      manufacturer_email: 'pharma@example.com',
      manufacturer_phone: '+91 9876543210',
      wholesaler_business_name: 'MedPlus Distributors',
      wholesaler_gstin: 'GSTIN987654321',
      wholesaler_address: '456 Distributor Road, Chennai, Tamil Nadu',
      wholesaler_email: 'medplus@example.com',
      wholesaler_phone: '+91 9123456789',
      subtotal: 5000.00,
      gst_total: 900.00,
      total_amount: 5900.00,
      tax_rate: 18,
      notes: 'Test invoice generated successfully',
      place_of_supply: 'Tamil Nadu',
      items: [
        {
          product_name: 'Dolo 650mg Tablets',
          description: 'Paracetamol Tablets',
          quantity: 100,
          unit_price: 30.00,
          tax_rate: 18,
          discount_percent: 0,
          batch_number: 'BATCH2025001',
          subtotal: 3000.00,
          gst_amount: 540.00,
          total_amount: 3540.00
        },
        {
          product_name: 'Cetirizine 10mg Tablets',
          description: 'Antihistamine Tablets',
          quantity: 50,
          unit_price: 40.00,
          tax_rate: 18,
          discount_percent: 5,
          batch_number: 'BATCH2025002',
          subtotal: 2000.00,
          gst_amount: 360.00,
          total_amount: 2360.00
        }
      ]
    };
    
    console.log('📄 Generating test PDF using invoiceService...');
    
    // Generate PDF using invoiceService
    const result = await invoiceService.generateInvoicePDF(testData);
    
    console.log('✅ PDF generated successfully:', {
      fileName: result.fileName,
      filePath: result.filePath,
      downloadUrl: result.downloadUrl
    });
    
    // Return success
    res.json({
      success: true,
      message: 'PDF generated successfully using invoiceService',
      data: {
        invoiceNumber: testData.invoice_number,
        totalAmount: testData.total_amount,
        pdfUrl: result.downloadUrl,
        downloadUrl: `/api/invoices/download/${result.fileName}`,
        fileInfo: {
          fileName: result.fileName,
          size: 'Check in uploads folder'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test PDF error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate test PDF',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 10. DIRECT DOWNLOAD TEST
router.get('/test/pdf/download', async (req, res) => {
  try {
    console.log('🧪 Testing direct PDF download...');
    
    // Create simple test data
    const testData = {
      invoice_number: `DOWNLOAD-TEST-${Date.now()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      payment_type: 'UPI',
      manufacturer_business_name: 'pharma',
      manufacturer_gstin: 'TESTGST123',
      manufacturer_address: 'Test Address, Test City',
      manufacturer_email: 'test@pharma.com',
      manufacturer_phone: '1234567890',
      wholesaler_business_name: 'Test Wholesaler',
      wholesaler_gstin: 'WHOLESALER456',
      wholesaler_address: 'Wholesaler Address',
      wholesaler_email: 'wholesaler@test.com',
      wholesaler_phone: '9876543210',
      subtotal: 1500.00,
      gst_total: 270.00,
      total_amount: 1770.00,
      tax_rate: 18,
      notes: 'Direct download test invoice',
      place_of_supply: 'Test State',
      items: [{
        product_name: 'Test Product',
        description: 'Product for testing',
        quantity: 10,
        unit_price: 150.00,
        tax_rate: 18,
        discount_percent: 0,
        subtotal: 1500.00,
        gst_amount: 270.00,
        total_amount: 1770.00
      }]
    };
    
    // Generate PDF using invoiceService
    const result = await invoiceService.generateInvoicePDF(testData);
    
    console.log('✅ Download test - PDF generated:', result.filePath);
    
    // Send file directly for download
    res.download(result.filePath, `test_invoice_${testData.invoice_number}.pdf`);
    
  } catch (error) {
    console.error('❌ Download test error:', error);
    res.status(500).send(`PDF generation failed: ${error.message}`);
  }
});

// 11. GET INVOICE BY ORDER ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`🔍 Getting invoice for order ID: ${orderId}`);
    
    // Get invoice from database
    const [invoices] = await db.execute(`
      SELECT i.* 
      FROM invoices i
      WHERE i.order_id = ? OR i.invoice_number LIKE ? OR i.notes LIKE ?
    `, [orderId, `%${orderId}%`, `%${orderId}%`]);
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No invoice found for this order'
      });
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const [items] = await db.execute(`
      SELECT ii.* 
      FROM invoice_items ii
      WHERE ii.invoice_id = ?
    `, [invoice.id]);
    
    invoice.items = items;
    
    res.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Error fetching invoice by order ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice'
    });
  }
});
// GET ALL INVOICES FOR SPECIFIC MANUFACTURER
router.get('/manufacturer/:manufacturerId', async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { status = 'all', sent = 'all' } = req.query;
    
    console.log(`📋 Fetching invoices for manufacturer ${manufacturerId}`);
    
    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.wholesaler_business_name,
        i.wholesaler_email,
        i.invoice_date,
        i.due_date,
        i.subtotal,
        i.gst_total,
        i.total_amount,
        i.status,
        i.pdf_path,
        i.is_sent,
        i.sent_at,
        i.created_at,
        i.notes,
        COUNT(ii.id) as items_count,
        SUM(ii.quantity) as total_quantity
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.manufacturer_id = ?
    `;
    
    const params = [manufacturerId];
    
    // Filter by status
    if (status && status !== 'all') {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    
    // Filter by sent status
    if (sent === 'sent') {
      query += ` AND i.is_sent = 1`;
    } else if (sent === 'not_sent') {
      query += ` AND i.is_sent = 0`;
    }
    
    query += ` GROUP BY i.id ORDER BY i.created_at DESC`;
    
    const [invoices] = await db.execute(query, params);
    
    console.log(`✅ Found ${invoices.length} invoices for manufacturer ${manufacturerId}`);
    
    res.json({
      success: true,
      data: invoices
    });
    
  } catch (error) {
    console.error('Error fetching manufacturer invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices'
    });
  }
});
// GET INVOICE ITEMS
router.get('/:id/items', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    const [items] = await db.execute(`
      SELECT 
        ii.*,
        p.category as hsn_code,
        p.image
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id ASC
    `, [invoiceId]);
    
    res.json({
      success: true,
      data: items
    });
    
  } catch (error) {
    console.error('Error fetching invoice items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice items'
    });
  }
});
export default router;