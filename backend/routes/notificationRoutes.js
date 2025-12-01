// routes/notifications.js
import express from 'express';
import { 
  getUserNotificationStats, 
  markNotificationAsRead,
  markAllNotificationsAsRead 
} from '../utils/notificationHelper.js';

const router = express.Router();

// Get notifications for user with filtering
router.get('/:userId', (req, res) => {
  const db = req.db;
  const { userId } = req.params;
  const { 
    limit = 50, 
    page = 1, 
    type, 
    is_read, 
    unread_only 
  } = req.query;

  let sql = `
    SELECT 
      id,
      user_id,
      title,
      message,
      type,
      related_order_id,
      is_read,
      created_at
    FROM notifications 
    WHERE user_id = ?
  `;
  
  const params = [userId];

  // Add filters
  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }
  
  if (is_read !== undefined) {
    sql += ` AND is_read = ?`;
    params.push(is_read === 'true' ? 1 : 0);
  }
  
  if (unread_only === 'true') {
    sql += ` AND is_read = 0`;
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching notifications:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications"
      });
    }

    // Get total counts
    let countSql = `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`;
    const countParams = [userId];
    
    if (unread_only === 'true') {
      countSql += ` AND is_read = 0`;
    }
    
    if (type) {
      countSql += ` AND type = ?`;
      countParams.push(type);
    }

    db.query(countSql, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error("❌ Error fetching notification counts:", countErr);
        return res.json({
          success: true,
          notifications: results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: results.length,
            totalPages: 1
          }
        });
      }

      // Get unread count separately
      const unreadSql = `SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`;
      db.query(unreadSql, [userId], (unreadErr, unreadResults) => {
        const unreadCount = unreadErr ? 0 : unreadResults[0].unreadCount;

        res.json({
          success: true,
          notifications: results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResults[0].total,
            unreadCount: unreadCount,
            totalPages: Math.ceil(countResults[0].total / parseInt(limit))
          }
        });
      });
    });
  });
});

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { notificationId } = req.params;

  try {
    const success = await markNotificationAsRead(db, notificationId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Get user ID to emit unread count update
    const getUserSql = `SELECT user_id FROM notifications WHERE id = ?`;
    db.query(getUserSql, [notificationId], (userErr, userResults) => {
      if (!userErr && userResults.length > 0 && io) {
        const userId = userResults[0].user_id;
        
        // Emit real-time unread count update
        getUserNotificationStats(db, userId)
          .then(stats => {
            io.to(`user-${userId}`).emit('unreadCountUpdate', {
              unreadCount: stats.unread
            });
          })
          .catch(console.error);
      }
    });

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification"
    });
  }
});

// Mark all notifications as read for a user
router.patch('/:userId/read-all', async (req, res) => {
  const db = req.db;
  const io = req.io;
  const { userId } = req.params;

  try {
    const affectedRows = await markAllNotificationsAsRead(db, userId);

    // Emit real-time unread count update
    if (io) {
      io.to(`user-${userId}`).emit('unreadCountUpdate', {
        unreadCount: 0
      });
    }

    res.json({
      success: true,
      message: `Marked ${affectedRows} notifications as read`
    });
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications"
    });
  }
});

// Get unread notification count for a user
router.get('/:userId/unread-count', (req, res) => {
  const db = req.db;
  const { userId } = req.params;

  const sql = `SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching unread count:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch unread count"
      });
    }

    res.json({
      success: true,
      unreadCount: results[0].unreadCount
    });
  });
});

// Get notification statistics
router.get('/:userId/stats', (req, res) => {
  const db = req.db;
  const { userId } = req.params;

  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN type = 'order_request' THEN 1 ELSE 0 END) as order_requests,
      SUM(CASE WHEN type = 'order_approved' THEN 1 ELSE 0 END) as order_approved,
      SUM(CASE WHEN type = 'order_rejected' THEN 1 ELSE 0 END) as order_rejected,
      SUM(CASE WHEN type = 'invoice_sent' THEN 1 ELSE 0 END) as invoice_sent,
      MAX(created_at) as latest_notification
    FROM notifications 
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching notification stats:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notification statistics"
      });
    }

    res.json({
      success: true,
      stats: results[0]
    });
  });
});

export default router;