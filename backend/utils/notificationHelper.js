// utils/notificationHelper.js
/**
 * Creates a new notification in the database
 * @param {object} db - Database connection
 * @param {number} userId - User ID to receive notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type from enum
 * @param {string} relatedOrderId - Related order ID
 * @returns {Promise}
 */
export const createNotification = (db, userId, title, message, type = 'order_request', relatedOrderId = null) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO notifications 
      (user_id, title, message, type, related_order_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `;
    
    const values = [userId, title, message, type, relatedOrderId];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ Error creating notification:', err);
        reject(err);
      } else {
        console.log(`✅ Notification created for user ${userId}: ${title}`);
        resolve({
          id: result.insertId,
          user_id: userId,
          title,
          message,
          type,
          related_order_id: relatedOrderId,
          is_read: 0,
          created_at: new Date()
        });
      }
    });
  });
};

/**
 * Create order-specific notifications
 */
export const createOrderNotification = (db, userId, orderId, action, additionalData = {}) => {
  const notificationTypes = {
    order_request: {
      title: 'New Order Request!',
      message: `New order #${orderId} has been placed.`,
      type: 'order_request'
    },
    order_approved: {
      title: 'Order Approved!',
      message: `Your order #${orderId} has been approved by the manufacturer.`,
      type: 'order_approved'
    },
    order_rejected: {
      title: 'Order Rejected',
      message: `Order #${orderId} was rejected. ${additionalData.reason ? `Reason: ${additionalData.reason}` : ''}`,
      type: 'order_rejected'
    },
    invoice_sent: {
      title: 'Invoice Sent',
      message: `Invoice for order #${orderId} has been generated and sent.`,
      type: 'invoice_sent'
    }
  };

  const config = notificationTypes[action];
  if (!config) {
    throw new Error(`Invalid notification type: ${action}`);
  }

  return createNotification(db, userId, config.title, config.message, config.type, orderId);
};

/**
 * Get notification statistics for a user
 */
export const getUserNotificationStats = (db, userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        MAX(created_at) as latest_notification
      FROM notifications 
      WHERE user_id = ?
    `;
    
    db.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = (db, notificationId) => {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
    
    db.query(sql, [notificationId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
};

/**
 * Mark all notifications as read for user
 */
export const markAllNotificationsAsRead = (db, userId) => {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`;
    
    db.query(sql, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows);
      }
    });
  });
};