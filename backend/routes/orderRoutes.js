// routes/orders.js
import express from 'express';
import { createNotification, createOrderNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Order creation endpoint
router.post('/', async (req, res) => {
  const db = req.db;
  const io = req.io;

  try {
    const orderData = req.body;
    console.log('📦 Creating new order:', orderData);
    
    const orderSql = `
      INSERT INTO orders 
      (order_id, manufacturer_id, wholesaler_id, product_id, quantity, unit_price, total_amount, 
       gst_percentage, gst_amount, payment_mode, delivery_address, preferred_delivery_date, 
       notes, status, order_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const orderValues = [
      orderData.order_id,
      orderData.manufacturer_id,
      orderData.wholesaler_id,
      orderData.product_id,
      orderData.quantity,
      orderData.unit_price,
      orderData.total_amount,
      orderData.gst_percentage || 18,
      orderData.gst_amount,
      orderData.payment_mode,
      orderData.delivery_address,
      orderData.preferred_delivery_date,
      orderData.notes || ''
    ];

    db.query(orderSql, orderValues, async (err, result) => {
      if (err) {
        console.error('❌ Error saving order:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to save order'
        });
      }

      console.log('✅ Order saved to database with ID:', result.insertId);

      try {
        // 🔥 Create database notification for manufacturer
        await createOrderNotification(
          db,
          orderData.manufacturer_id,
          orderData.order_id,
          'order_request'
        );
        console.log('✅ Database notification created for manufacturer');

        // 🔥 Send real-time notification to manufacturer
        if (io && orderData.manufacturer_id) {
          console.log(`📢 Sending real-time notification to manufacturer-${orderData.manufacturer_id}`);
          
          io.to(`manufacturer-${orderData.manufacturer_id}`).emit('newOrder', {
            orderId: orderData.order_id,
            productName: orderData.product_name,
            quantity: orderData.quantity,
            totalAmount: orderData.total_amount,
            wholesalerName: orderData.wholesaler_name,
            timestamp: new Date().toISOString(),
            order_id: orderData.order_id,
            product_name: orderData.product_name,
            unit_price: orderData.unit_price,
            gst_amount: orderData.gst_amount,
            payment_mode: orderData.payment_mode,
            delivery_address: orderData.delivery_address,
            preferred_delivery_date: orderData.preferred_delivery_date,
            notes: orderData.notes,
            manufacturer_id: orderData.manufacturer_id,
            wholesaler_id: orderData.wholesaler_id
          });

          // Emit unread count update to manufacturer
          io.to(`manufacturer-${orderData.manufacturer_id}`).emit('unreadCountUpdate', {
            unreadCount: 1, // Increment by 1 for new order
            hasNewOrder: true
          });

          console.log('✅ Real-time notification sent successfully!');
        }

        res.json({
          success: true,
          message: 'Order placed successfully!',
          orderId: orderData.order_id
        });

      } catch (notificationError) {
        console.error('❌ Error creating notification:', notificationError);
        // Still respond success since order was created
        res.json({
          success: true,
          message: 'Order placed successfully! (Notification failed)',
          orderId: orderData.order_id
        });
      }
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
});

// Get orders for manufacturer
router.get('/manufacturer/:manufacturerId', (req, res) => {
  const db = req.db;
  const { manufacturerId } = req.params;

  const sql = `
    SELECT o.*, p.product_name, w.company_name as wholesaler_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.product_id
    LEFT JOIN wholesalers w ON o.wholesaler_id = w.wholesaler_id
    WHERE o.manufacturer_id = ? 
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [manufacturerId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching manufacturer orders:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }

    res.json({
      success: true,
      orders: results
    });
  });
});

// GET ORDERS FOR WHOLESALER
router.get('/wholesaler/:wholesalerId', (req, res) => {
  const db = req.db;
  const { wholesalerId } = req.params;

  const sql = `
    SELECT o.*, p.product_name, m.company_name as manufacturer_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.product_id
    LEFT JOIN manufacturers m ON o.manufacturer_id = m.manufacturer_id
    WHERE o.wholesaler_id = ? 
    ORDER BY o.order_date DESC
  `;

  db.query(sql, [wholesalerId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching wholesaler orders:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }

    res.json({
      success: true,
      orders: results
    });
  });
});

// GET SINGLE ORDER DETAILS
router.get('/:orderId', (req, res) => {
  const db = req.db;
  const { orderId } = req.params;

  const sql = `
    SELECT o.*, p.product_name, m.company_name as manufacturer_name, w.company_name as wholesaler_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.product_id
    LEFT JOIN manufacturers m ON o.manufacturer_id = m.manufacturer_id
    LEFT JOIN wholesalers w ON o.wholesaler_id = w.wholesaler_id
    WHERE o.order_id = ?
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching order:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order details'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order: results[0]
    });
  });
});

// GENERIC ORDER STATUS UPDATE
router.post('/:orderId/update-status', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;
  const { status, notes, userId } = req.body;

  const validStatuses = ['pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
    });
  }

  const sql = `UPDATE orders SET status = ?, notes = COALESCE(?, notes), updated_at = NOW() WHERE order_id = ?`;
  
  db.query(sql, [status, notes, orderId], async (err, result) => {
    if (err) {
      console.error('❌ Error updating order status:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    try {
      // Create appropriate notification based on status
      if (status === 'approved') {
        // Get wholesaler ID to send notification
        const getWholesalerSql = `SELECT wholesaler_id FROM orders WHERE order_id = ?`;
        db.query(getWholesalerSql, [orderId], async (err, orderResults) => {
          if (!err && orderResults.length > 0) {
            const wholesalerId = orderResults[0].wholesaler_id;
            
            await createOrderNotification(
              db,
              wholesalerId,
              orderId,
              'order_approved'
            );

            // Emit real-time notification to wholesaler
            if (io) {
              io.to(`wholesaler-${wholesalerId}`).emit('orderStatusUpdate', {
                orderId: orderId,
                status: 'approved',
                message: 'Your order has been approved by the manufacturer'
              });
            }
          }
        });
      } else if (status === 'rejected' && userId) {
        // userId should be the wholesaler ID for rejection notifications
        await createOrderNotification(
          db,
          userId,
          orderId,
          'order_rejected',
          { reason: notes || 'No reason provided' }
        );

        // Emit real-time notification
        if (io) {
          io.to(`wholesaler-${userId}`).emit('orderStatusUpdate', {
            orderId: orderId,
            status: 'rejected',
            message: `Order rejected: ${notes || 'No reason provided'}`
          });
        }
      }

      // Emit general order status update
      if (io) {
        io.emit('orderStatusUpdate', {
          orderId,
          status,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Order status updated successfully'
      });

    } catch (notificationError) {
      console.error('❌ Error creating status notification:', notificationError);
      res.json({
        success: true,
        message: 'Order status updated (notification failed)'
      });
    }
  });
});

// Accept order endpoint
router.post('/:orderId/accept', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;

  try {
    console.log(`🔄 Accepting order: ${orderId}`);

    // 1. Update order status to 'approved'
    const updateOrderSql = `UPDATE orders SET status = 'approved', updated_at = NOW() WHERE order_id = ?`;
    
    db.query(updateOrderSql, [orderId], async (err, result) => {
      if (err) {
        console.error('❌ Error updating order status:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update order status' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }

      try {
        // 2. Get order details to find wholesaler_id
        const getOrderSql = `SELECT wholesaler_id, product_id, quantity FROM orders WHERE order_id = ?`;
        db.query(getOrderSql, [orderId], async (err, orderResults) => {
          if (err || orderResults.length === 0) {
            console.error('❌ Error fetching order details:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to fetch order details' 
            });
          }

          const order = orderResults[0];
          const wholesalerUserId = order.wholesaler_id;

          // 3. Reduce manufacturer's product quantity (if you have a products table)
          const updateProductSql = `UPDATE products SET stock_qty = stock_qty - ? WHERE product_id = ?`;
          db.query(updateProductSql, [order.quantity, order.product_id], async (err) => {
            if (err) {
              console.error('❌ Error updating product stock:', err);
              // Continue anyway - don't fail the whole request
            }

            try {
              // 4. Create database notification for wholesaler
              await createOrderNotification(
                db, 
                wholesalerUserId, 
                orderId,
                'order_approved'
              );
              console.log('✅ Database notification created for order approval');

              // 5. Emit real-time notification to wholesaler
              if (io) {
                io.to(`wholesaler-${wholesalerUserId}`).emit('orderStatusUpdate', {
                  orderId: orderId,
                  status: 'approved',
                  message: 'Your order has been approved by the manufacturer'
                });

                // Also emit unread count update
                io.to(`wholesaler-${wholesalerUserId}`).emit('unreadCountUpdate', {
                  unreadCount: 1,
                  hasNewNotification: true
                });

                console.log(`📢 Real-time notification sent to wholesaler-${wholesalerUserId}`);
              }

              res.json({ 
                success: true, 
                message: 'Order accepted successfully',
                orderId: orderId
              });

            } catch (notificationError) {
              console.error('❌ Error creating notification:', notificationError);
              res.json({ 
                success: true, 
                message: 'Order accepted but notification failed',
                orderId: orderId
              });
            }
          });
        });
      } catch (error) {
        console.error('❌ Error in order acceptance process:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Order accepted but notification process failed' 
        });
      }
    });

  } catch (error) {
    console.error('❌ Error accepting order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Reject order endpoint
router.post('/:orderId/reject', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { orderId } = req.params;
  const { rejectionReason } = req.body;

  try {
    console.log(`🔄 Rejecting order: ${orderId}`, { rejectionReason });

    // 1. Update order status to 'rejected'
    const updateOrderSql = `UPDATE orders SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE order_id = ?`;
    
    db.query(updateOrderSql, [rejectionReason, orderId], async (err, result) => {
      if (err) {
        console.error('❌ Error updating order status:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update order status' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }

      try {
        // 2. Get order details to find wholesaler_id
        const getOrderSql = `SELECT wholesaler_id FROM orders WHERE order_id = ?`;
        db.query(getOrderSql, [orderId], async (err, orderResults) => {
          if (err || orderResults.length === 0) {
            console.error('❌ Error fetching order details:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to fetch order details' 
            });
          }

          const wholesalerUserId = orderResults[0].wholesaler_id;

          // 3. Create database notification for wholesaler
          await createOrderNotification(
            db, 
            wholesalerUserId, 
            orderId,
            'order_rejected',
            { reason: rejectionReason }
          );

          console.log('✅ Database notification created for order rejection');

          // 4. Emit real-time notification to wholesaler
          if (io) {
            io.to(`wholesaler-${wholesalerUserId}`).emit('orderStatusUpdate', {
              orderId: orderId,
              status: 'rejected',
              message: `Order rejected: ${rejectionReason}`
            });

            // Also emit unread count update
            io.to(`wholesaler-${wholesalerUserId}`).emit('unreadCountUpdate', {
              unreadCount: 1,
              hasNewNotification: true
            });

            console.log(`📢 Real-time notification sent to wholesaler-${wholesalerUserId}`);
          }

          res.json({ 
            success: true, 
            message: 'Order rejected successfully',
            orderId: orderId
          });
        });
      } catch (error) {
        console.error('❌ Error in order rejection process:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Order rejected but notification process failed' 
        });
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;