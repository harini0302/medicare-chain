// routes/orderRoutes.js
import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';
import invoiceService from '../services/invoiceService.js';
import db, { sendInvoiceEmail, sendOrderEmail } from '../config/database.js';
// Get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Helper function for promise-based queries
const queryPromise = async (db, sql, params = []) => {
  const [rows] = await db.execute(sql, params);
  return rows;
};

// ✅ Get order with items
router.get('/:orderId/items', (req, res) => {
  const db = req.db;
  const { orderId } = req.params;

  console.log(`📦 Fetching order items for: ${orderId}`);

  const sql = `
    SELECT 
      oi.*,
      p.name as original_product_name,
      p.sku,
      p.category,
      p.image as product_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching order items:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order items'
      });
    }

    res.json({
      success: true,
      items: results,
      count: results.length
    });
  });
});
// In orderRoutes.js - Update the notification section in /multi endpoint
router.post('/multi', async (req, res) => {
  const db = req.db;
  
  try {
    const {
      wholesaler_id,
      manufacturer_id,
      items,
      subtotal,
      gst_amount,
      total_amount,
      delivery_address,
      payment_mode,
      preferred_delivery_date,
      notes,
      payment_status = 'pending'
    } = req.body;

    console.log('📦 Creating multi-item order:', {
      wholesaler_id,
      manufacturer_id,
      item_count: items?.length || 0,
      subtotal,
      total_amount
    });

    // Validate input
    if (!wholesaler_id || !manufacturer_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: wholesaler_id, manufacturer_id, or items'
      });
    }

    // Generate unique order ID
    const order_id = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Start transaction
    db.query('START TRANSACTION', async (startErr) => {
      if (startErr) {
        console.error('❌ Error starting transaction:', startErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to start transaction'
        });
      }

      try {
        // 1. Create main order record
        const orderSql = `
          INSERT INTO orders 
          (order_id, wholesaler_id, manufacturer_id, subtotal, gst_amount, total_amount,
           payment_mode, delivery_address, preferred_delivery_date, notes, 
           status, payment_status, order_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
        `;

        const orderValues = [
          order_id,
          wholesaler_id,
          manufacturer_id,
          subtotal || 0,
          gst_amount || 0,
          total_amount || 0,
          payment_mode || 'online',
          delivery_address || '',
          preferred_delivery_date || null,
          notes || '',
          payment_status
        ];

        console.log('📝 Creating order with values:', orderValues);
        
        // Execute using callback
        db.query(orderSql, orderValues, async (orderErr, orderResult) => {
          if (orderErr) {
            console.error('❌ Error creating order:', orderErr);
            return db.rollback(() => {
              res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: orderErr.message
              });
            });
          }

          console.log('✅ Main order created with ID:', order_id);

          // 2. Create order items
          const orderItems = [];
          let itemsProcessed = 0;
          let itemError = null;

          // Process each item
          for (const item of items) {
            if (!item.product_id || !item.quantity || !item.unit_price) {
              itemError = new Error(`Invalid item data: ${JSON.stringify(item)}`);
              break;
            }

            // Calculate item totals
            const unit_price = parseFloat(item.unit_price);
            const quantity = parseInt(item.quantity);
            const gst_percentage = parseFloat(item.gst_percentage) || 18.00;
            
            const total_price = unit_price * quantity;
            const discount_percentage = parseFloat(item.discount_percentage) || 0.00;
            const discount_amount = total_price * (discount_percentage / 100);
            const gst_amount = (total_price - discount_amount) * (gst_percentage / 100);
            const final_price = total_price - discount_amount + gst_amount;

            const itemSql = `
              INSERT INTO order_items 
              (order_id, product_id, medicine_name, quantity, unit_price, 
               total_price, gst_percentage, gst_amount, discount_percentage,
               discount_amount, final_price, item_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `;

            const itemValues = [
              order_id,
              item.product_id,
              item.medicine_name || 'Product',
              quantity,
              unit_price,
              total_price,
              gst_percentage,
              gst_amount,
              discount_percentage,
              discount_amount,
              final_price
            ];

            // Execute item insertion
            db.query(itemSql, itemValues, (itemErr, itemResult) => {
              if (itemErr) {
                itemError = itemErr;
              } else {
                orderItems.push({
                  id: itemResult.insertId,
                  ...item,
                  order_id: order_id,
                  total_price: total_price,
                  gst_amount: gst_amount,
                  discount_amount: discount_amount,
                  final_price: final_price
                });
              }

              itemsProcessed++;

              // When all items are processed
              if (itemsProcessed === items.length) {
                if (itemError) {
                  console.error('❌ Error creating order items:', itemError);
                  return db.rollback(() => {
                    res.status(500).json({
                      success: false,
                      message: 'Failed to create order items',
                      error: itemError.message
                    });
                  });
                }

                console.log(`✅ Created ${orderItems.length} order items`);

                // ✅ FIXED: Create proper notification for manufacturer
                const notificationSql = `
                  INSERT INTO notifications 
                  (user_id, title, message, type, related_order_id, is_read, created_at)
                  VALUES (?, ?, ?, ?, ?, 0, NOW())
                `;

                const notificationMessage = `New order #${order_id} from wholesaler. Items: ${items.length}, Total: ₹${total_amount}`;
                
                db.query(notificationSql, [
                  manufacturer_id, 
                  'New Order Received 📦', 
                  notificationMessage, 
                  'order_request', 
                  order_id
                ], (notifErr) => {
                  if (notifErr) {
                    console.log('⚠️ Could not create notification:', notifErr.message);
                  } else {
                    console.log(`✅ Notification created for manufacturer ${manufacturer_id}`);
                  }

                  // ✅ FIXED: Also create notification for wholesaler
                  const wholesalerNotifSql = `
                    INSERT INTO notifications 
                    (user_id, title, message, type, related_order_id, is_read, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, NOW())
                  `;
                  
                  db.query(wholesalerNotifSql, [
                    wholesaler_id,
                    'Order Placed Successfully ✅',
                    `Your order #${order_id} has been placed. Awaiting manufacturer approval.`,
                    'order_placed',
                    order_id
                  ], (wholesalerNotifErr) => {
                    if (wholesalerNotifErr) {
                      console.log('⚠️ Could not create wholesaler notification:', wholesalerNotifErr.message);
                    }

                    // ✅ FIXED: Send Socket.IO notification to manufacturer
                    if (req.io) {
                      // First, emit a test to check connection
                      req.io.emit('test', { message: 'Order placed, testing socket' });
                      
                      // Send notification to manufacturer room
                      req.io.to(`manufacturer-${manufacturer_id}`).emit('newOrder', { 
  orderId: order_id,
  type: 'new_order',
  itemCount: items.length,
  totalAmount: total_amount,
  wholesalerId: wholesaler_id,
  timestamp: new Date().toISOString(),
  message: 'New order received'
});
                      
                      // Also send to wholesaler room
                      req.io.to(`wholesaler-${wholesaler_id}`).emit('orderUpdate', {
                        orderId: order_id,
                        status: 'pending',
                        message: 'Order placed successfully',
                        timestamp: new Date().toISOString()
                      });
                      
                      console.log(`📢 Socket notifications sent to manufacturer-${manufacturer_id} and wholesaler-${wholesaler_id}`);
                    } else {
                      console.log('⚠️ Socket.IO instance not available in request');
                    }

                    // Commit transaction
                    db.query('COMMIT', (commitErr) => {
                      if (commitErr) {
                        console.error('❌ Error committing transaction:', commitErr);
                        return res.status(500).json({
                          success: false,
                          message: 'Failed to commit transaction',
                          error: commitErr.message
                        });
                      }

                      console.log('✅ Transaction committed successfully');

                      // Get the created order details
                      db.query('SELECT * FROM orders WHERE order_id = ?', [order_id], (selectErr, orderRows) => {
                        if (selectErr) {
                          console.error('❌ Error fetching created order:', selectErr);
                        }

                        const createdOrder = orderRows ? orderRows[0] : null;

                        res.json({
                          success: true,
                          message: 'Multi-item order placed successfully',
                          order: {
                            ...createdOrder,
                            order_id: order_id,
                            item_count: items.length,
                            items: orderItems
                          }
                        });
                      });
                    });
                  });
                });
              }
            });
          }

          if (itemError) {
            db.rollback(() => {
              res.status(500).json({
                success: false,
                message: 'Failed to process items',
                error: itemError.message
              });
            });
          }
        });
      } catch (error) {
        console.error('❌ Error in transaction:', error);
        db.rollback(() => {
          res.status(500).json({
            success: false,
            message: error.message || 'Failed to create order',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        });
      }
    });
  } catch (error) {
    console.error('❌ Error creating multi-item order:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
router.post('/:orderId/accept-with-invoice', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;
  
  const { userId, manufacturer_id } = req.body;
  const actualUserId = userId || manufacturer_id;
  
  console.log(`📦 [INVOICE] Processing order ${orderId} for user ${actualUserId}`);
  
  if (!actualUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  try {
    // 1. Get order details
    const getOrderSql = `
      SELECT 
        o.*,
        w.id as wholesaler_id,
        w.email as wholesaler_email,
        w.fullName as wholesaler_name,
        w.phoneNumber as wholesaler_phone,
        cv.businessName as wholesaler_business_name,
        cv.businessAddress as wholesaler_address,
        cv.panGstNumber as wholesaler_gstin,
        cv.state as wholesaler_state,
        m.email as manufacturer_email,
        m.fullName as manufacturer_name,
        mcv.businessName as manufacturer_business_name,
        mcv.businessAddress as manufacturer_address,
        mcv.panGstNumber as manufacturer_gstin
      FROM orders o
      LEFT JOIN users w ON o.wholesaler_id = w.id
      LEFT JOIN users m ON o.manufacturer_id = m.id
      LEFT JOIN company_verification cv ON w.email = cv.email
      LEFT JOIN company_verification mcv ON m.email = mcv.email
      WHERE o.order_id = ? AND o.status = 'pending'
    `;
    
    const orderResults = await new Promise((resolve, reject) => {
      db.query(getOrderSql, [orderId], (err, results) => {
        if (err) {
          console.error('❌ Database error fetching order:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    
    if (!orderResults || orderResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found or already processed`
      });
    }
    
    const order = orderResults[0];
    console.log(`📧 Wholesaler email: ${order.wholesaler_email}`);
    
    // Check authorization
    if (parseInt(order.manufacturer_id) !== parseInt(actualUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this order'
      });
    }
    
    // 2. Get order items
    const getItemsSql = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku,
        p.description,
        p.category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    
    const orderItems = await new Promise((resolve, reject) => {
      db.query(getItemsSql, [orderId], (err, results) => {
        if (err) {
          console.error('❌ Database error fetching order items:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order has no items'
      });
    }
    
    console.log(`✅ Found ${orderItems.length} items for order`);
    
    // Start transaction
    await new Promise((resolve, reject) => {
      db.query('START TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    try {
      // 3. Update order status
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE orders SET status = 'approved', updated_at = NOW() WHERE order_id = ?`,
          [orderId],
          (err) => {
            if (err) {
              console.error('❌ Error updating order status:', err);
              reject(err);
            } else {
              console.log(`✅ Order ${orderId} status updated to 'approved'`);
              resolve();
            }
          }
        );
      });
      
      // 4. Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 100)}`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const subtotal = parseFloat(order.subtotal) || 0;
      const gstTotal = parseFloat(order.gst_amount) || 0;
      const totalAmount = parseFloat(order.total_amount) || 0;
      
      // 5. Create invoice
      const insertInvoiceSql = `
        INSERT INTO invoices (
          invoice_number,
          order_id,
          manufacturer_id,
          wholesaler_id,
          manufacturer_business_name,
          manufacturer_address,
          manufacturer_gstin,
          manufacturer_email,
          wholesaler_business_name,
          wholesaler_address,
          wholesaler_gstin,
          wholesaler_email,
          wholesaler_phone,
          invoice_date,
          due_date,
          place_of_supply,
          subtotal,
          gst_total,
          total_amount,
          payment_terms,
          notes,
          status,
          is_sent,
          sent_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 0, NULL, NOW())
      `;
      
      const invoiceValues = [
        invoiceNumber,
        orderId,
        order.manufacturer_id,
        order.wholesaler_id,
        order.manufacturer_business_name || 'Manufacturer',
        order.manufacturer_address || 'Address not provided',
        order.manufacturer_gstin || '',
        order.manufacturer_email || '',
        order.wholesaler_business_name || 'Wholesaler',
        order.wholesaler_address || 'Address not provided',
        order.wholesaler_gstin || '',
        order.wholesaler_email,
        order.wholesaler_phone || '',
        invoiceDate,
        dueDate,
        order.wholesaler_state || 'Not specified',
        subtotal,
        gstTotal,
        totalAmount,
        'Payment due within 30 days',
        `Invoice generated for order ${orderId}`
      ];
      
      console.log(`📝 Creating invoice ${invoiceNumber}...`);
      
      const invoiceResult = await new Promise((resolve, reject) => {
        db.query(insertInvoiceSql, invoiceValues, (err, result) => {
          if (err) {
            console.error('❌ Error creating invoice:', err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      
      const invoiceId = invoiceResult.insertId;
      
      // 6. Create invoice items
      console.log(`📝 Creating ${orderItems.length} invoice items...`);
      
      for (const item of orderItems) {
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        const itemGstPercentage = parseFloat(item.gst_percentage) || 18.00;
        const itemGstAmount = (itemSubtotal * itemGstPercentage) / 100;
        const itemTotal = itemSubtotal + itemGstAmount;
        
        const insertItemQuery = `
          INSERT INTO invoice_items (
            invoice_id,
            product_id,
            product_name,
            description,
            quantity,
            unit_price,
            gst_percentage,
            gst_amount,
            total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        console.log(`   Item ${item.product_name || item.medicine_name}: GST ${itemGstPercentage}% = ₹${itemGstAmount.toFixed(2)}`);
        
        await new Promise((resolve, reject) => {
          db.query(insertItemQuery, [
            invoiceId,
            item.product_id,
            item.product_name || item.medicine_name || 'Product',
            item.description || '',
            item.quantity,
            item.unit_price,
            itemGstPercentage,
            itemGstAmount.toFixed(2),
            itemTotal.toFixed(2)
          ], (err) => {
            if (err) {
              console.error('❌ Error inserting invoice item:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      console.log(`✅ Invoice ${invoiceNumber} created with ${orderItems.length} items`);
      
      // 7. GENERATE PDF USING YOUR INVOICE SERVICE
      let pdfPath = null;
      let emailSent = false;
      let emailError = null;
      
      try {
        // Prepare invoice data for PDF generation using your invoiceService
        const invoiceDataForPDF = {
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate,
          payment_type: 'Net 30 Days',
          manufacturer_business_name: order.manufacturer_business_name || 'Manufacturer',
          manufacturer_gstin: order.manufacturer_gstin || '',
          manufacturer_address: order.manufacturer_address || 'Address not provided',
          manufacturer_email: order.manufacturer_email || '',
          manufacturer_phone: order.manufacturer_phone || '',
          wholesaler_business_name: order.wholesaler_business_name || 'Wholesaler',
          wholesaler_gstin: order.wholesaler_gstin || '',
          wholesaler_address: order.wholesaler_address || 'Address not provided',
          wholesaler_email: order.wholesaler_email,
          wholesaler_phone: order.wholesaler_phone || '',
          subtotal: subtotal,
          gst_total: gstTotal,
          total_amount: totalAmount,
          tax_rate: 18,
          notes: `Invoice for order ${orderId}. Items: ${orderItems.length}. Payment due within 30 days.`,
          place_of_supply: order.wholesaler_state || 'Not specified',
          items: orderItems.map(item => ({
            product_name: item.product_name || item.medicine_name || 'Product',
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.gst_percentage || 18,
            discount_percent: 0,
            batch_number: item.batch_number || '',
            subtotal: item.quantity * item.unit_price,
            gst_amount: (item.quantity * item.unit_price * (item.gst_percentage || 18)) / 100,
            total_amount: (item.quantity * item.unit_price) * (1 + (item.gst_percentage || 18) / 100)
          }))
        };
        
        console.log('📄 Generating PDF using invoiceService...');
        
        // Use your invoiceService to generate PDF
        const pdfResult = await invoiceService.generateInvoicePDF(invoiceDataForPDF);
        pdfPath = pdfResult.filePath;
        
        console.log(`✅ PDF generated: ${pdfResult.fileName}`);
        console.log(`📁 File path: ${pdfPath}`);
        
      } catch (pdfError) {
        console.error('❌ Error generating PDF:', pdfError);
        // Continue even if PDF fails
      }
     // 8. SEND EMAIL TO WHOLESALER WITH PDF ATTACHMENT
if (order.wholesaler_email) {
  try {
    console.log(`📧 Preparing to send invoice email to: ${order.wholesaler_email}`);
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured in .env file');
      emailError = 'Email service not configured';
    } else {
      // Prepare invoice data for email
      const invoiceForEmail = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        wholesaler_email: order.wholesaler_email,
        wholesaler_business_name: order.wholesaler_business_name || order.wholesaler_name,
        manufacturer_business_name: order.manufacturer_business_name || order.manufacturer_name,
        total_amount: totalAmount,
        items_count: orderItems.length,
        pdf_path: pdfPath
      };
      
      console.log(`📧 Sending invoice email with PDF attachment...`);
      
      if (pdfPath) {
        // ✅ FIXED: Use the imported sendInvoiceEmail function directly
        // Make sure it's properly imported at the top
        await sendInvoiceEmail(
          order.wholesaler_email,
          invoiceForEmail,
          pdfPath
        );
      } else {
        // Send email without attachment if PDF generation failed
        // ✅ FIXED: Use the imported sendOrderEmail function directly
        await sendOrderEmail(
          order.wholesaler_email,
          'newOrder',
          {
            orderId: orderId,
            wholesalerName: order.wholesaler_business_name || order.wholesaler_name,
            productName: orderItems.length > 0 
              ? (orderItems[0].product_name || orderItems[0].medicine_name || 'Products')
              : 'Products',
            quantity: orderItems.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0),
            totalAmount: totalAmount.toFixed(2),
            orderDate: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }
        );
      }
      
      console.log(`✅ Invoice email sent to ${order.wholesaler_email}`);
      emailSent = true;
      
      // Update invoice record to mark as sent
      await new Promise((resolve, reject) => {
        db.query(
          'UPDATE invoices SET is_sent = 1, sent_at = NOW(), pdf_path = ? WHERE id = ?',
          [pdfPath ? `invoice_${invoiceNumber}.pdf` : null, invoiceId],
          (err) => {
            if (err) {
              console.error('❌ Error updating invoice sent status:', err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    
  } catch (emailErr) {
    console.error('❌ Failed to send invoice email:', emailErr);
    emailError = emailErr.message;
    // Continue even if email fails
  }
} else {
  console.warn('⚠️ No wholesaler email found for order:', orderId);
  emailError = 'No wholesaler email in database';
}
      // 9. Create notification
      const message = emailSent 
        ? `Your order #${orderId} has been approved. Invoice #${invoiceNumber} has been generated and emailed to you. Amount: ₹${totalAmount.toFixed(2)}`
        : `Your order #${orderId} has been approved. Invoice #${invoiceNumber} generated. Amount: ₹${totalAmount.toFixed(2)}`;
      
      await new Promise((resolve, reject) => {
        db.query(`
          INSERT INTO notifications 
          (user_id, title, message, type, related_order_id, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, 0, NOW())
        `, [
          order.wholesaler_id,
          'Order Approved ✅',
          message,
          'order_approved',
          orderId
        ], (err) => {
          if (err) {
            console.error('❌ Error creating notification:', err);
            reject(err);
          } else {
            console.log(`✅ Notification created for wholesaler ${order.wholesaler_id}`);
            resolve();
          }
        });
      });
      
      // 10. Send socket notification
      if (io && order.wholesaler_id) {
        io.to(`wholesaler-${order.wholesaler_id}`).emit('orderUpdate', {
          orderId: orderId,
          status: 'approved',
          invoiceNumber: invoiceNumber,
          invoiceId: invoiceId,
          message: `Order accepted. Invoice #${invoiceNumber} generated${emailSent ? ' and emailed' : ''}.`,
          emailSent: emailSent,
          timestamp: new Date().toISOString(),
          pdfUrl: pdfPath ? `/api/invoices/download/invoice_${invoiceNumber}.pdf` : null
        });
        console.log(`📢 Socket notification sent to wholesaler-${order.wholesaler_id}`);
      }
      
      // 11. Commit transaction
      await new Promise((resolve, reject) => {
        db.query('COMMIT', (err) => {
          if (err) {
            console.error('❌ Error committing transaction:', err);
            reject(err);
          } else {
            console.log('✅ Transaction committed successfully');
            resolve();
          }
        });
      });
      
      console.log(`✅ [INVOICE COMPLETE] Order ${orderId} processed successfully. Email sent: ${emailSent}, PDF generated: ${pdfPath ? 'Yes' : 'No'}`);
      
      // 12. Return response
      res.json({
        success: true,
        message: 'Order accepted and invoice generated successfully',
        orderId: orderId,
        invoiceId: invoiceId,
        invoiceNumber: invoiceNumber,
        totalAmount: totalAmount.toFixed(2),
        itemsCount: orderItems.length,
        wholesalerEmail: order.wholesaler_email,
        emailSent: emailSent,
        emailError: emailError,
        pdfGenerated: !!pdfPath,
        pdfUrl: pdfPath ? `/api/invoices/download/invoice_${invoiceNumber}.pdf` : null,
        invoice: {
          id: invoiceId,
          number: invoiceNumber,
          date: invoiceDate,
          dueDate: dueDate,
          total: totalAmount
        }
      });
      
    } catch (error) {
      console.error('❌ Error in transaction:', error);
      
      // Rollback transaction
      await new Promise((resolve) => {
        db.query('ROLLBACK', (rollbackErr) => {
          if (rollbackErr) {
            console.error('❌ Error rolling back transaction:', rollbackErr);
          }
          resolve();
        });
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error('❌ [INVOICE ERROR]:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing invoice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// ✅ FIXED: Update order status (for multi-item orders)
router.patch('/:orderId/status', async (req, res) => {
  try {
    const db = req.db;
    const io = req.io;
    const { orderId } = req.params;
    const { status, notes, userId } = req.body;

    console.log(`🔄 Updating order ${orderId} status to: ${status}`);

    // Check if order exists
    const checkSql = `SELECT id, wholesaler_id, manufacturer_id, status FROM orders WHERE order_id = ?`;
    
    const [checkResults] = await db.execute(checkSql, [orderId]);

    if (checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found`
      });
    }

    const order = checkResults[0];
    
    // Check authorization - allow both manufacturer AND wholesaler to update certain statuses
    const isManufacturer = parseInt(order.manufacturer_id) === parseInt(userId);
    const isWholesaler = parseInt(order.wholesaler_id) === parseInt(userId);
    
    if (!isManufacturer && !isWholesaler) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    // Validate who can update what status
    if (isManufacturer && ['rejected', 'processing', 'shipped'].includes(status)) {
      // Manufacturer can reject, mark as processing, or shipped
    } else if (isWholesaler && status === 'cancelled') {
      // Wholesaler can cancel if order is still pending
      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending orders can be cancelled'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to change status to ${status}`
      });
    }

    // Update order status
    const updateSql = `
      UPDATE orders 
      SET status = ?, 
          notes = COALESCE(?, notes),
          updated_at = NOW()
      WHERE order_id = ?
    `;
    
    await db.execute(updateSql, [status, notes, orderId]);

    // Update all order items status (only for manufacturer updates)
    if (isManufacturer) {
      const updateItemsSql = `UPDATE order_items SET item_status = ? WHERE order_id = ?`;
      await db.execute(updateItemsSql, [status, orderId]);
    }

    // Create notification for the other party
    const notificationTo = isManufacturer ? order.wholesaler_id : order.manufacturer_id;
    const notificationSql = `
      INSERT INTO notifications 
      (user_id, title, message, type, related_order_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `;

    const title = status === 'approved' ? 'Order Approved!' : 
                 status === 'rejected' ? 'Order Rejected' : 
                 'Order Status Updated';
    
    const message = isManufacturer 
      ? `Order #${orderId} status changed to ${status} by manufacturer`
      : `Order #${orderId} ${status === 'cancelled' ? 'cancelled' : 'status updated'} by wholesaler`;
    
    const type = status === 'approved' ? 'order_approved' : 
                 status === 'rejected' ? 'order_rejected' : 
                 'order_update';

    await db.execute(notificationSql, [notificationTo, title, message, type, orderId]);

    // Send socket notification
    if (io) {
      const targetRoom = isManufacturer ? `wholesaler-${order.wholesaler_id}` : `manufacturer-${order.manufacturer_id}`;
      io.to(targetRoom).emit('orderUpdate', {
        orderId: orderId,
        status: status,
        message: message,
        timestamp: new Date().toISOString(),
        updatedBy: isManufacturer ? 'manufacturer' : 'wholesaler'
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      orderId: orderId
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// ✅ Accept multi-item order with inventory update
router.post('/:orderId/accept-multi', (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;
  const { userId } = req.body;

  console.log(`✅ Accepting multi-item order: ${orderId}`);

  // Begin transaction
  db.beginTransaction(async (beginErr) => {
    if (beginErr) {
      console.error('❌ Error starting transaction:', beginErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to start transaction'
      });
    }

    try {
      // 1. Get order and items
      const getOrderSql = `
        SELECT o.*, oi.*, p.stock_qty 
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.order_id = ? AND o.manufacturer_id = ?
      `;

      const results = await new Promise((resolve, reject) => {
        db.query(getOrderSql, [orderId, userId], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      if (results.length === 0) {
        throw new Error('Order not found or unauthorized');
      }

      const order = {
        ...results[0],
        items: results
      };

      // 2. Check stock availability for all items
      const insufficientStock = results.filter(item => 
        item.stock_qty !== null && item.stock_qty < item.quantity
      );

      if (insufficientStock.length > 0) {
        throw new Error(`Insufficient stock for: ${insufficientStock.map(i => i.medicine_name).join(', ')}`);
      }

      // 3. Update inventory for each item
      for (const item of results) {
        if (item.product_id && item.stock_qty !== null) {
          await new Promise((resolve, reject) => {
            const updateStockSql = `UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`;
            db.query(updateStockSql, [item.quantity, item.product_id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      // 4. Update order and items status
      await new Promise((resolve, reject) => {
        const updateOrderSql = `UPDATE orders SET status = 'approved', updated_at = NOW() WHERE order_id = ?`;
        db.query(updateOrderSql, [orderId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        const updateItemsSql = `UPDATE order_items SET item_status = 'approved' WHERE order_id = ?`;
        db.query(updateItemsSql, [orderId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. Create notification
      await new Promise((resolve, reject) => {
        const notificationSql = `
          INSERT INTO notifications 
          (user_id, title, message, type, related_order_id, is_read, created_at)
          VALUES (?, 'Order Approved!', ?, 'order_approved', ?, 0, NOW())
        `;
        const message = `Your multi-item order #${orderId} has been approved. Total: ₹${order.total_amount}`;
        
        db.query(notificationSql, [order.wholesaler_id, message, orderId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 6. Send socket notification
      if (io) {
        io.to(`wholesaler-${order.wholesaler_id}`).emit('orderUpdate', {
          orderId: orderId,
          status: 'approved',
          type: 'multi_item',
          itemCount: results.length,
          totalAmount: order.total_amount,
          message: `Multi-item order #${orderId} approved`,
          timestamp: new Date().toISOString()
        });
      }
        // Add this validation before sending
if (!userData.id) {
  alert("User data not found. Please log in again.");
  return;
}

if (!selectedManufacturer.id) {
  alert("Invalid manufacturer selected.");
  return;
}

// Log the data being sent
console.log("🔍 Order data being sent:", JSON.stringify(orderData, null, 2));
      // 7. Commit transaction
      await new Promise((resolve, reject) => {
        db.commit((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        success: true,
        message: 'Multi-item order approved and inventory updated',
        orderId: orderId,
        itemsUpdated: results.length,
        totalAmount: order.total_amount
      });

    } catch (error) {
      console.error('❌ Error accepting order:', error);
      await new Promise((resolve) => {
        db.rollback(() => resolve());
      });
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to accept order'
      });
    }
  });
});
// ✅ Reject order endpoint (PUT method)
// ✅ Reject order endpoint (PUT method)
router.put("/:orderId/reject", (req, res) => {
  const db = req.db; // Add this line - get db from request
  const io = req.io; // Add this if you want socket notifications
  const { orderId } = req.params;
  const { rejection_reason, manufacturerId } = req.body; // Changed from user_id to manufacturerId
  
  console.log(`❌ Rejecting order: ${orderId}, Reason: ${rejection_reason}, Manufacturer: ${manufacturerId}`);
  
  // 1. First verify the manufacturer owns this order
  const verifySql = "SELECT * FROM orders WHERE order_id = ? AND manufacturer_id = ?";
  
  db.query(verifySql, [orderId, manufacturerId], (verifyErr, verifyResult) => {
    if (verifyErr) {
      console.error("❌ Error verifying order ownership:", verifyErr);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    
    if (verifyResult.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found or you don't have permission to reject it" 
      });
    }
    
    // 2. Update order status to 'rejected'
    const updateOrderSql = `
      UPDATE orders 
      SET status = 'rejected', 
          rejection_reason = ?,
          updated_at = NOW()
      WHERE order_id = ?
    `;
    
    db.query(updateOrderSql, [rejection_reason || 'No reason provided', orderId], (err, result) => {
      if (err) {
        console.error("❌ Error rejecting order:", err);
        return res.status(500).json({ success: false, message: "Failed to reject order" });
      }
      
      console.log(`✅ Order ${orderId} rejected successfully`);
      
      const order = verifyResult[0];
      const wholesalerId = order.wholesaler_id;
      
      // 3. Create notification for wholesaler
      const notificationSql = `
        INSERT INTO notifications (user_id, type, title, message, related_order_id, is_read, created_at)
        VALUES (?, 'order_rejected', 'Order Rejected', ?, ?, 0, NOW())
      `;
      
      const notificationMessage = `Your order ${orderId} has been rejected. Reason: ${rejection_reason || 'No reason provided'}`;
      
      db.query(notificationSql, [wholesalerId, notificationMessage, orderId], (notifErr) => {
        if (notifErr) {
          console.error("❌ Error creating notification:", notifErr);
        }
        
        // 4. Send socket notification to wholesaler
        if (io && wholesalerId) {
          io.to(`wholesaler_${wholesalerId}`).emit('order_rejected', {
            orderId: orderId,
            status: 'rejected',
            message: notificationMessage,
            timestamp: new Date().toISOString()
          });
        }
        
        // 5. Also delete manufacturer's notification for this order
        const deleteNotifSql = "DELETE FROM notifications WHERE related_order_id = ? AND user_id = ? AND type LIKE '%order%'";
        db.query(deleteNotifSql, [orderId, manufacturerId], (deleteErr) => {
          if (deleteErr) {
            console.error("❌ Error deleting manufacturer notification:", deleteErr);
          }
        });
        
        // Send success response
        res.json({
          success: true,
          message: `Order ${orderId} rejected successfully`,
          orderId: orderId,
          status: 'rejected',
          notificationCreated: true
        });
      });
    });
  });
});
// ✅ Delete notification endpoint
router.delete("/notifications/:notificationId", (req, res) => {
  const db = req.db;
  const { notificationId } = req.params;
  
  console.log(`🗑️ Deleting notification: ${notificationId}`);
  
  const sql = "DELETE FROM notifications WHERE id = ?";
  
  db.query(sql, [notificationId], (err, result) => {
    if (err) {
      console.error("❌ Error deleting notification:", err);
      return res.status(500).json({ success: false, message: "Failed to delete notification" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    
    res.json({
      success: true,
      message: "Notification deleted successfully"
    });
  });
});
// In your orderRoutes.js - Fix the manufacturer orders endpoint
router.get('/manufacturer/:manufacturerId', (req, res) => {
  const db = req.db;
  const { manufacturerId } = req.params;
  const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

  console.log(`🏭 Fetching orders for manufacturer: ${manufacturerId}`);

  // FIXED: Remove GROUP BY or fix the query
  let sql = `
    SELECT 
      o.*,
      (
        SELECT COUNT(*) 
        FROM order_items oi 
        WHERE oi.order_id = o.order_id
      ) as item_count,
      (
        SELECT SUM(quantity) 
        FROM order_items oi 
        WHERE oi.order_id = o.order_id
      ) as total_quantity
    FROM orders o
    WHERE o.manufacturer_id = ?
  `;
  
  let countSql = `SELECT COUNT(*) as total FROM orders WHERE manufacturer_id = ?`;
  const params = [manufacturerId];
  const countParams = [manufacturerId];

  if (status) {
    sql += ` AND o.status = ?`;
    countSql += ` AND status = ?`;
    params.push(status);
    countParams.push(status);
  }

  if (startDate) {
    sql += ` AND DATE(o.order_date) >= ?`;
    countSql += ` AND DATE(order_date) >= ?`;
    params.push(startDate);
    countParams.push(startDate);
  }

  if (endDate) {
    sql += ` AND DATE(o.order_date) <= ?`;
    countSql += ` AND DATE(order_date) <= ?`;
    params.push(endDate);
    countParams.push(endDate);
  }

  sql += ` ORDER BY o.order_date DESC`;

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  // Get total count
  db.query(countSql, countParams, (countErr, countResults) => {
    if (countErr) {
      console.error('❌ Error counting orders:', countErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to count orders'
      });
    }

    const total = countResults[0].total;

    // Get orders
    db.query(sql, params, (err, orders) => {
      if (err) {
        console.error('❌ Error fetching manufacturer orders:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch orders'
        });
      }

      // If no orders, return empty array
      if (orders.length === 0) {
        return res.json({
          success: true,
          orders: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        });
      }

      // Get wholesaler info for each order separately
      const orderIds = orders.map(o => o.order_id);
      const wholesalerInfoSql = `
        SELECT 
          o.order_id,
          u.fullName as wholesaler_name,
          cv.businessname as wholesaler_business
        FROM orders o
        LEFT JOIN users u ON o.wholesaler_id = u.id
        LEFT JOIN company_verification cv ON u.email = cv.email
        WHERE o.order_id IN (?)
      `;

      db.query(wholesalerInfoSql, [orderIds], (wholesalerErr, wholesalerInfos) => {
        if (wholesalerErr) {
          console.error('❌ Error fetching wholesaler info:', wholesalerErr);
          return res.json({
            success: true,
            orders: processManufacturerOrders(orders, []),
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        }

        // Create a map of order_id to wholesaler info
        const wholesalerMap = {};
        wholesalerInfos.forEach(info => {
          wholesalerMap[info.order_id] = {
            wholesaler_name: info.wholesaler_name,
            wholesaler_business: info.wholesaler_business
          };
        });

        // Get items for each order
        const itemsSql = `
          SELECT oi.*, p.name as original_product_name, p.sku, p.category
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id IN (?)
          ORDER BY oi.id ASC
        `;

        db.query(itemsSql, [orderIds], (itemsErr, items) => {
          if (itemsErr) {
            console.error('❌ Error fetching order items:', itemsErr);
            return res.json({
              success: true,
              orders: processManufacturerOrders(orders, [], wholesalerMap),
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
              }
            });
          }

          // Group items by order_id
          const itemsByOrder = {};
          items.forEach(item => {
            if (!itemsByOrder[item.order_id]) {
              itemsByOrder[item.order_id] = [];
            }
            itemsByOrder[item.order_id].push(item);
          });

          // Attach items and wholesaler info to orders
          const finalOrders = processManufacturerOrders(orders, itemsByOrder, wholesalerMap);

          res.json({
            success: true,
            orders: finalOrders,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        });
      });
    });
  });
});

// Updated helper function
const processManufacturerOrders = (orders, itemsByOrder, wholesalerMap = {}) => {
  return orders.map(order => {
    const wholesalerInfo = wholesalerMap[order.order_id] || {};
    
    return {
      ...order,
      ...wholesalerInfo, // Add wholesaler_name and wholesaler_business
      items: itemsByOrder[order.order_id] || [],
      // Add calculated totals
      calculated_total: itemsByOrder[order.order_id]?.reduce((sum, item) => 
        sum + (item.final_price || item.total_price || 0), 0
      ) || order.total_amount
    };
  });
};

// ✅ Get orders with items for wholesaler
router.get('/wholesaler/:wholesalerId', (req, res) => {
  const db = req.db;
  const { wholesalerId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  console.log(`🏪 Fetching orders for wholesaler: ${wholesalerId}`);

  let sql = `
    SELECT 
      o.*,
      COUNT(oi.id) as item_count,
      SUM(oi.quantity) as total_quantity,
      mu.fullName as manufacturer_name,
      cm.businessname as manufacturer_business
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN company_verification cm ON mu.email = cm.email
    WHERE o.wholesaler_id = ?
  `;
  
  let countSql = `SELECT COUNT(*) as total FROM orders WHERE wholesaler_id = ?`;
  const params = [wholesalerId];
  const countParams = [wholesalerId];

  if (status) {
    sql += ` AND o.status = ?`;
    countSql += ` AND status = ?`;
    params.push(status);
    countParams.push(status);
  }

  sql += ` GROUP BY o.id ORDER BY o.order_date DESC`;

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  // Get total count
  db.query(countSql, countParams, (countErr, countResults) => {
    if (countErr) {
      console.error('❌ Error counting orders:', countErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to count orders'
      });
    }

    const total = countResults[0].total;

    // Get orders
    db.query(sql, params, (err, orders) => {
      if (err) {
        console.error('❌ Error fetching wholesaler orders:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch orders'
        });
      }

      // Get items for each order
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: []
      }));

      // If there are orders, fetch their items
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.order_id);
        const itemsSql = `
          SELECT oi.*, p.name as original_product_name, p.sku, p.category, p.image as product_image
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id IN (?)
          ORDER BY oi.id ASC
        `;

        db.query(itemsSql, [orderIds], (itemsErr, items) => {
          if (itemsErr) {
            console.error('❌ Error fetching order items:', itemsErr);
            return res.json({
              success: true,
              orders: ordersWithItems,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
              }
            });
          }

          // Group items by order_id
          const itemsByOrder = {};
          items.forEach(item => {
            if (!itemsByOrder[item.order_id]) {
              itemsByOrder[item.order_id] = [];
            }
            itemsByOrder[item.order_id].push(item);
          });

          // Attach items to orders
          const finalOrders = ordersWithItems.map(order => ({
            ...order,
            items: itemsByOrder[order.order_id] || []
          }));

          res.json({
            success: true,
            orders: finalOrders,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        });
      } else {
        res.json({
          success: true,
          orders: ordersWithItems,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      }
    });
  });
});

// ✅ Get order details with items
router.get('/:orderId/details', (req, res) => {
  const db = req.db;
  const { orderId } = req.params;

  console.log(`🔍 Fetching order details: ${orderId}`);

  const sql = `
    SELECT 
      o.*,
      mu.fullName as manufacturer_name,
      mu.email as manufacturer_email,
      cm.businessname as manufacturer_business,
      cm.businessAddress as manufacturer_address,
      cm.panGstNumber as manufacturer_gstin,
      wu.fullName as wholesaler_name,
      wu.email as wholesaler_email,
      cw.businessname as wholesaler_business,
      cw.businessAddress as wholesaler_address,
      cw.panGstNumber as wholesaler_gstin
    FROM orders o
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN company_verification cm ON mu.email = cm.email
    LEFT JOIN users wu ON o.wholesaler_id = wu.id
    LEFT JOIN company_verification cw ON wu.email = cw.email
    WHERE o.order_id = ?
  `;

  db.query(sql, [orderId], (err, orderResults) => {
    if (err) {
      console.error('❌ Error fetching order:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order details'
      });
    }

    if (orderResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResults[0];

    // Get order items
    const itemsSql = `
      SELECT 
        oi.*,
        p.name as original_product_name,
        p.sku,
        p.category,
        p.description as product_description,
        p.image as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `;

    db.query(itemsSql, [orderId], (itemsErr, items) => {
      if (itemsErr) {
        console.error('❌ Error fetching order items:', itemsErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch order items'
        });
      }

      res.json({
        success: true,
        order: {
          ...order,
          items: items
        }
      });
    });
  });
});

// ✅ Update individual item status
router.patch('/order-items/:itemId/status', (req, res) => {
  const db = req.db;
  const io = req.io;
  const { itemId } = req.params;
  const { status, notes, userId } = req.body;

  console.log(`📝 Updating item ${itemId} status to: ${status}`);

  // Get item details to check authorization
  const getItemSql = `
    SELECT oi.*, o.manufacturer_id, o.wholesaler_id, o.order_id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.id = ?
  `;

  db.query(getItemSql, [itemId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching item:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    const item = results[0];
    
    // Check authorization (only manufacturer can update)
    if (parseInt(item.manufacturer_id) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Update item status
    const updateSql = `
      UPDATE order_items 
      SET item_status = ?, 
          rejection_reason = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    db.query(updateSql, [status, notes || null, itemId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('❌ Error updating item:', updateErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to update item'
        });
      }

      // Check if all items are approved/rejected to update overall order status
      const checkItemsSql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN item_status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN item_status = 'rejected' THEN 1 END) as rejected_count
        FROM order_items 
        WHERE order_id = ?
      `;

      db.query(checkItemsSql, [item.order_id], (checkErr, checkResults) => {
        if (checkErr) {
          console.error('❌ Error checking items:', checkErr);
        } else {
          const stats = checkResults[0];
          let overallStatus = 'pending';
          
          if (stats.approved_count === stats.total) {
            overallStatus = 'approved';
          } else if (stats.rejected_count === stats.total) {
            overallStatus = 'rejected';
          } else if (stats.approved_count > 0 || stats.rejected_count > 0) {
            overallStatus = 'partially_processed';
          }

          // Update overall order status if changed
          if (overallStatus !== 'pending') {
            db.query(
              `UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?`,
              [overallStatus, item.order_id],
              (orderUpdateErr) => {
                if (orderUpdateErr) {
                  console.error('❌ Error updating order status:', orderUpdateErr);
                }
              }
            );
          }

          // Send notification to wholesaler if item status changed
          if (status === 'approved' || status === 'rejected') {
            const notificationTitle = status === 'approved' ? 'Item Approved' : 'Item Rejected';
            const message = status === 'approved'
              ? `Item "${item.medicine_name}" in order #${item.order_id} has been approved`
              : `Item "${item.medicine_name}" in order #${item.order_id} was rejected`;
            
            const notificationSql = `
              INSERT INTO notifications 
              (user_id, title, message, type, related_order_id, is_read, created_at)
              VALUES (?, ?, ?, ?, ?, 0, NOW())
            `;

            db.query(notificationSql, [
              item.wholesaler_id,
              notificationTitle,
              message,
              'order_update',
              item.order_id
            ], (notifErr) => {
              if (notifErr) {
                console.error('❌ Error creating notification:', notifErr);
              }

              // Send socket notification
              if (io) {
                io.to(`wholesaler-${item.wholesaler_id}`).emit('orderItemUpdate', {
                  orderId: item.order_id,
                  itemId: itemId,
                  itemName: item.medicine_name,
                  status: status,
                  message: message,
                  timestamp: new Date().toISOString()
                });
              }
            });
          }
        }
      });

      res.json({
        success: true,
        message: `Item status updated to ${status}`,
        itemId: itemId,
        orderId: item.order_id
      });
    });
  });
});

// ✅ Update delivery quantities
router.patch('/order-items/:itemId/delivery', (req, res) => {
  const db = req.db;
  const { itemId } = req.params;
  const { shipped_quantity, delivered_quantity, userId } = req.body;

  console.log(`🚚 Updating delivery for item ${itemId}`);

  // Get item and check authorization
  const getItemSql = `
    SELECT oi.*, o.manufacturer_id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.id = ?
  `;

  db.query(getItemSql, [itemId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching item:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    const item = results[0];
    
    // Check authorization
    if (parseInt(item.manufacturer_id) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update delivery'
      });
    }

    // Validate quantities
    const newShipped = shipped_quantity !== undefined ? parseInt(shipped_quantity) : item.shipped_quantity;
    const newDelivered = delivered_quantity !== undefined ? parseInt(delivered_quantity) : item.delivered_quantity;

    if (newShipped > item.quantity || newDelivered > item.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Delivery quantity cannot exceed ordered quantity'
      });
    }

    if (newDelivered > newShipped) {
      return res.status(400).json({
        success: false,
        message: 'Delivered quantity cannot exceed shipped quantity'
      });
    }

    // Update delivery quantities
    const updateSql = `
      UPDATE order_items 
      SET shipped_quantity = ?,
          delivered_quantity = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    db.query(updateSql, [newShipped, newDelivered, itemId], (updateErr) => {
      if (updateErr) {
        console.error('❌ Error updating delivery:', updateErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to update delivery'
        });
      }

      res.json({
        success: true,
        message: 'Delivery quantities updated',
        itemId: itemId,
        shipped_quantity: newShipped,
        delivered_quantity: newDelivered,
        order_quantity: item.quantity
      });
    });
  });
});

// ✅ Get order statistics for dashboard
router.get('/statistics/:userId', (req, res) => {
  const db = req.db;
  const { userId } = req.params;
  const { role } = req.query; // 'manufacturer' or 'wholesaler'

  console.log(`📊 Fetching statistics for ${role} ${userId}`);

  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role is required'
    });
  }

  if (role === 'manufacturer') {
    // Manufacturer statistics
    const sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_orders,
        COUNT(DISTINCT wholesaler_id) as unique_wholesalers
      FROM orders 
      WHERE manufacturer_id = ?
      AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('❌ Error fetching manufacturer stats:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch statistics'
        });
      }

      res.json({
        success: true,
        statistics: results[0] || {},
        role: 'manufacturer'
      });
    });

  } else if (role === 'wholesaler') {
    // Wholesaler statistics
    const sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_spent,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_orders,
        COUNT(DISTINCT manufacturer_id) as unique_manufacturers
      FROM orders 
      WHERE wholesaler_id = ?
      AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('❌ Error fetching wholesaler stats:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch statistics'
        });
      }

      res.json({
        success: true,
        statistics: results[0] || {},
        role: 'wholesaler'
      });
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid role'
    });
  }
});

// ✅ Reject multi-item order
router.post('/:orderId/reject-multi', (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;
  const { rejectionReason, userId } = req.body;

  console.log(`❌ Rejecting multi-item order: ${orderId}`);

  const checkSql = `SELECT id, wholesaler_id, manufacturer_id, status FROM orders WHERE order_id = ?`;
  
  db.query(checkSql, [orderId], (checkErr, checkResults) => {
    if (checkErr || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = checkResults[0];
    
    // Check authorization
    if (parseInt(order.manufacturer_id) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this order'
      });
    }

    // Begin transaction
    db.beginTransaction(async (beginErr) => {
      if (beginErr) {
        console.error('❌ Error starting transaction:', beginErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to start transaction'
        });
      }

      try {
        // Update order status
        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE orders SET status = 'rejected', notes = ?, updated_at = NOW() WHERE order_id = ?`,
            [rejectionReason || 'No reason provided', orderId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Update all order items status
        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE order_items SET item_status = 'rejected', rejection_reason = ? WHERE order_id = ?`,
            [rejectionReason || 'No reason provided', orderId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Create notification
        await new Promise((resolve, reject) => {
          const notificationSql = `
            INSERT INTO notifications 
            (user_id, title, message, type, related_order_id, is_read, created_at)
            VALUES (?, 'Order Rejected', ?, 'order_rejected', ?, 0, NOW())
          `;
          const message = `Your multi-item order #${orderId} was rejected: ${rejectionReason || 'No reason provided'}`;
          
          db.query(notificationSql, [order.wholesaler_id, message, orderId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Send socket notification
        if (io) {
          io.to(`wholesaler-${order.wholesaler_id}`).emit('orderUpdate', {
            orderId: orderId,
            status: 'rejected',
            message: `Order #${orderId} rejected: ${rejectionReason || 'No reason provided'}`,
            timestamp: new Date().toISOString()
          });
        }

        // Commit transaction
        await new Promise((resolve, reject) => {
          db.commit((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        res.json({
          success: true,
          message: 'Multi-item order rejected',
          orderId: orderId
        });

      } catch (error) {
        console.error('❌ Error rejecting order:', error);
        await new Promise((resolve) => {
          db.rollback(() => resolve());
        });
        
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to reject order'
        });
      }
    });
  });
});

// ✅ Update order payment status
router.patch('/:orderId/payment', (req, res) => {
  const db = req.db;
  const { orderId } = req.params;
  const { payment_status, payment_mode, userId } = req.body;

  console.log(`💰 Updating payment status for order: ${orderId}`);

  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  if (!validPaymentStatuses.includes(payment_status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment status'
    });
  }

  const checkSql = `SELECT wholesaler_id, manufacturer_id FROM orders WHERE order_id = ?`;
  
  db.query(checkSql, [orderId], (checkErr, checkResults) => {
    if (checkErr || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = checkResults[0];
    
    // Check if user is wholesaler or manufacturer
    const isWholesaler = parseInt(order.wholesaler_id) === parseInt(userId);
    const isManufacturer = parseInt(order.manufacturer_id) === parseInt(userId);
    
    if (!isWholesaler && !isManufacturer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment status'
      });
    }

    const updateSql = `
      UPDATE orders 
      SET payment_status = ?, 
          payment_mode = COALESCE(?, payment_mode),
          updated_at = NOW()
      WHERE order_id = ?
    `;
    
    db.query(updateSql, [payment_status, payment_mode, orderId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('❌ Error updating payment status:', updateErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to update payment status'
        });
      }

      // Create notification for the other party
      const notificationTo = isWholesaler ? order.manufacturer_id : order.wholesaler_id;
      const notificationSql = `
        INSERT INTO notifications 
        (user_id, title, message, type, related_order_id, is_read, created_at)
        VALUES (?, 'Payment Status Updated', ?, 'payment_update', ?, 0, NOW())
      `;

      const message = `Payment status for order #${orderId} updated to ${payment_status} by ${isWholesaler ? 'wholesaler' : 'manufacturer'}`;
      
      db.query(notificationSql, [notificationTo, message, orderId], (notifErr) => {
        if (notifErr) {
          console.error('❌ Error creating notification:', notifErr);
        }

        res.json({
          success: true,
          message: 'Payment status updated',
          orderId: orderId,
          payment_status: payment_status
        });
      });
    });
  });
});
// ✅ Get order summary dashboard
router.get('/dashboard/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, period = '30days' } = req.query;
    
    const periods = {
      '7days': '7 DAY',
      '30days': '30 DAY',
      '90days': '90 DAY'
    };
    
    const interval = periods[period] || '30 DAY';
    
    let summarySql = `
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE ${role}_id = ?
        AND order_date >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `;
    
    // Use promise-based query
    const results = await queryPromise(summarySql, [userId]);
    
    res.json({
      success: true,
      summary: results,
      period: period
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});// ✅ Bulk update order statuses
router.patch('/bulk-status', async (req, res) => {
  try {
    const { orderIds, status, userId, role } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order IDs provided'
      });
    }
    
    // Begin transaction
    await queryPromise('START TRANSACTION');
    
    // Update orders
    const updateSql = `
      UPDATE orders 
      SET status = ?, 
          updated_at = NOW(),
          updated_by = ?
      WHERE order_id IN (?)
      AND ${role}_id = ?
    `;
    
    await queryPromise(updateSql, [status, userId, orderIds, userId]);
    
    // Update order items
    const updateItemsSql = `
      UPDATE order_items 
      SET item_status = ?
      WHERE order_id IN (?)
    `;
    
    await queryPromise(updateItemsSql, [status, orderIds]);
    
    // Commit
    await queryPromise('COMMIT');
    
    res.json({
      success: true,
      message: `Updated ${orderIds.length} orders to ${status}`,
      count: orderIds.length
    });
    
  } catch (error) {
    await queryPromise('ROLLBACK');
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update orders'
    });
  }
});// ✅ Bulk update order statuses
router.patch('/bulk-status', async (req, res) => {
  try {
    const { orderIds, status, userId, role } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order IDs provided'
      });
    }
    
    // Begin transaction
    await queryPromise('START TRANSACTION');
    
    // Update orders
    const updateSql = `
      UPDATE orders 
      SET status = ?, 
          updated_at = NOW(),
          updated_by = ?
      WHERE order_id IN (?)
      AND ${role}_id = ?
    `;
    
    await queryPromise(updateSql, [status, userId, orderIds, userId]);
    
    // Update order items
    const updateItemsSql = `
      UPDATE order_items 
      SET item_status = ?
      WHERE order_id IN (?)
    `;
    
    await queryPromise(updateItemsSql, [status, orderIds]);
    
    // Commit
    await queryPromise('COMMIT');
    
    res.json({
      success: true,
      message: `Updated ${orderIds.length} orders to ${status}`,
      count: orderIds.length
    });
    
  } catch (error) {
    await queryPromise('ROLLBACK');
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update orders'
    });
  }
});

export default router;