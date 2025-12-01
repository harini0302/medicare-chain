import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import invoiceService from '../services/invoiceService.js';

const router = express.Router();

// ES6 module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to check authentication (you can modify based on your auth system)
const authenticateManufacturer = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    // Verify token - adjust based on your authentication system
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    // For now, we'll assume authentication is handled elsewhere
    // You can implement proper JWT verification here
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Download invoice PDF
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Security check: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid file name' });
    }

    const filePath = path.join(__dirname, '../invoices', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice file not found' 
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    // Use 'attachment' instead of 'inline' if you want to force download:
    // res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(500).json({ success: false, message: 'Error streaming invoice file' });
    });

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error downloading invoice',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get invoice by order ID
router.get('/order/:orderId', authenticateManufacturer, async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    const invoice = await invoiceService.getInvoiceByOrderId(orderId);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found for this order' 
      });
    }

    res.json({ 
      success: true, 
      invoice 
    });

  } catch (error) {
    console.error('Error fetching invoice by order ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoice',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all invoices for a manufacturer
router.get('/manufacturer/:manufacturerId', authenticateManufacturer, async (req, res) => {
  try {
    const { manufacturerId } = req.params;

    if (!manufacturerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manufacturer ID is required' 
      });
    }

    const invoices = await invoiceService.getInvoicesByManufacturer(manufacturerId);

    res.json({ 
      success: true, 
      count: invoices.length,
      invoices 
    });

  } catch (error) {
    console.error('Error fetching manufacturer invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all invoices for a wholesaler
router.get('/wholesaler/:wholesalerId', authenticateManufacturer, async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    if (!wholesalerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wholesaler ID is required' 
      });
    }

    const connection = await invoiceService.getDBConnection();
    
    try {
      const query = `
        SELECT i.*, 
               m.businessName as manufacturer_name,
               m.email as manufacturer_email
        FROM invoices i
        LEFT JOIN users m ON i.manufacturer_id = m.id
        WHERE i.wholesaler_id = ?
        ORDER BY i.created_at DESC
      `;
      
      const [invoices] = await connection.execute(query, [wholesalerId]);
      
      res.json({ 
        success: true, 
        count: invoices.length,
        invoices 
      });
      
    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Error fetching wholesaler invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update invoice status
router.patch('/:invoiceNumber/status', authenticateManufacturer, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { status } = req.body;

    if (!invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice number is required' 
      });
    }

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }

    const validStatuses = ['generated', 'sent', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: generated, sent, paid, cancelled' 
      });
    }

    const updated = await invoiceService.updateInvoiceStatus(invoiceNumber, status);
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    res.json({ 
      success: true, 
      message: `Invoice status updated to ${status}` 
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating invoice status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete invoice
router.delete('/:invoiceNumber', authenticateManufacturer, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice number is required' 
      });
    }

    const deleted = await invoiceService.deleteInvoice(invoiceNumber);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Invoice deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting invoice',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get invoice statistics for dashboard
router.get('/stats/manufacturer/:manufacturerId', authenticateManufacturer, async (req, res) => {
  try {
    const { manufacturerId } = req.params;

    if (!manufacturerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manufacturer ID is required' 
      });
    }

    const connection = await invoiceService.getDBConnection();
    
    try {
      // Total invoices count
      const [totalResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM invoices WHERE manufacturer_id = ?',
        [manufacturerId]
      );

      // Paid invoices count
      const [paidResult] = await connection.execute(
        'SELECT COUNT(*) as paid FROM invoices WHERE manufacturer_id = ? AND status = "paid"',
        [manufacturerId]
      );

      // Total revenue
      const [revenueResult] = await connection.execute(
        'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM invoices WHERE manufacturer_id = ? AND status = "paid"',
        [manufacturerId]
      );

      // Recent invoices (last 30 days)
      const [recentResult] = await connection.execute(
        `SELECT i.*, w.businessName as wholesaler_name 
         FROM invoices i 
         LEFT JOIN users w ON i.wholesaler_id = w.id 
         WHERE i.manufacturer_id = ? AND i.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
         ORDER BY i.created_at DESC 
         LIMIT 5`,
        [manufacturerId]
      );

      const stats = {
        totalInvoices: totalResult[0].total,
        paidInvoices: paidResult[0].paid,
        pendingInvoices: totalResult[0].total - paidResult[0].paid,
        totalRevenue: parseFloat(revenueResult[0].total_revenue),
        recentInvoices: recentResult
      };

      res.json({ 
        success: true, 
        stats 
      });
      
    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoice statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search invoices
router.get('/search', authenticateManufacturer, async (req, res) => {
  try {
    const { query, manufacturerId, status, startDate, endDate } = req.query;

    if (!manufacturerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manufacturer ID is required' 
      });
    }

    const connection = await invoiceService.getDBConnection();
    
    try {
      let sqlQuery = `
        SELECT i.*, 
               w.businessName as wholesaler_name,
               w.email as wholesaler_email
        FROM invoices i
        LEFT JOIN users w ON i.wholesaler_id = w.id
        WHERE i.manufacturer_id = ?
      `;
      
      const queryParams = [manufacturerId];

      // Add search conditions
      if (query) {
        sqlQuery += ` AND (
          i.invoice_number LIKE ? OR 
          i.order_id LIKE ? OR 
          w.businessName LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (status) {
        sqlQuery += ` AND i.status = ?`;
        queryParams.push(status);
      }

      if (startDate) {
        sqlQuery += ` AND DATE(i.created_at) >= ?`;
        queryParams.push(startDate);
      }

      if (endDate) {
        sqlQuery += ` AND DATE(i.created_at) <= ?`;
        queryParams.push(endDate);
      }

      sqlQuery += ` ORDER BY i.created_at DESC`;

      const [invoices] = await connection.execute(sqlQuery, queryParams);
      
      res.json({ 
        success: true, 
        count: invoices.length,
        invoices 
      });
      
    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Error searching invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching invoices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Regenerate invoice (if needed)
router.post('/:invoiceNumber/regenerate', authenticateManufacturer, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice number is required' 
      });
    }

    // Get original invoice data
    const connection = await invoiceService.getDBConnection();
    
    try {
      const [invoices] = await connection.execute(
        `SELECT i.*, o.*, m.*, w.* 
         FROM invoices i
         LEFT JOIN orders o ON i.order_id = o.order_id
         LEFT JOIN users m ON i.manufacturer_id = m.id
         LEFT JOIN users w ON i.wholesaler_id = w.id
         WHERE i.invoice_number = ?`,
        [invoiceNumber]
      );

      if (invoices.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invoice not found' 
        });
      }

      const invoiceData = invoices[0];

      // Regenerate PDF
      const newInvoiceData = await invoiceService.generateInvoicePDF(
        invoiceData,
        invoiceData,
        invoiceData
      );

      // Update database with new file info
      const updateQuery = `
        UPDATE invoices 
        SET file_path = ?, file_name = ?, download_url = ?, updated_at = NOW()
        WHERE invoice_number = ?
      `;
      
      await connection.execute(updateQuery, [
        newInvoiceData.filePath,
        newInvoiceData.fileName,
        newInvoiceData.downloadUrl,
        invoiceNumber
      ]);

      res.json({ 
        success: true, 
        message: 'Invoice regenerated successfully',
        downloadUrl: newInvoiceData.downloadUrl
      });
      
    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Error regenerating invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error regenerating invoice',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check if invoices directory exists and is writable
    const invoicesDir = path.join(__dirname, '../invoices');
    const isDirectoryWritable = await fs.access(invoicesDir, fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);

    // Check database connection
    const connection = await invoiceService.getDBConnection();
    const [dbResult] = await connection.execute('SELECT 1 as test');
    await connection.end();

    res.json({
      success: true,
      message: 'Invoice service is healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult[0].test === 1,
        fileSystem: isDirectoryWritable,
        pdfGeneration: true
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Invoice service health check failed',
      error: error.message
    });
  }
});

export default router;