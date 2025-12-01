import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InvoiceService {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../invoices');
    this.ensureInvoicesDirectory();
  }

  ensureInvoicesDirectory() {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  generateInvoiceNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  }

  async generateInvoicePDF(order, manufacturer, wholesaler) {
    return new Promise((resolve, reject) => {
      try {
        const invoiceNumber = this.generateInvoiceNumber();
        const fileName = `invoice_${invoiceNumber}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Simple invoice content
        doc.fontSize(20).text('INVOICE', 100, 100);
        doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`, 100, 150);
        doc.text(`Order ID: ${order.order_id}`, 100, 175);
        doc.text(`Manufacturer: ${manufacturer.businessName}`, 100, 200);
        doc.text(`Wholesaler: ${wholesaler.businessName}`, 100, 225);
        doc.text(`Product: ${order.product_name}`, 100, 250);
        doc.text(`Quantity: ${order.quantity}`, 100, 275);
        doc.text(`Total Amount: $${order.total_amount}`, 100, 300);

        doc.end();

        stream.on('finish', () => {
          resolve({
            invoiceNumber,
            filePath,
            fileName,
            downloadUrl: `/api/invoices/download/${fileName}`
          });
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  async getInvoiceByOrderId(orderId) {
    // Mock implementation - replace with actual database query
    console.log('Getting invoice for order:', orderId);
    return null;
  }

  async getInvoicesByManufacturer(manufacturerId) {
    // Mock implementation
    console.log('Getting invoices for manufacturer:', manufacturerId);
    return [];
  }

  async getDBConnection() {
    // Mock implementation - use your actual database connection
    return mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pharma_supply_chain'
    });
  }

  async updateInvoiceStatus(invoiceNumber, status) {
    console.log(`Updating invoice ${invoiceNumber} to status: ${status}`);
    return true;
  }

  async deleteInvoice(invoiceNumber) {
    console.log(`Deleting invoice: ${invoiceNumber}`);
    return true;
  }

  async saveInvoiceToDatabase(invoiceData, orderId, manufacturerId, wholesalerId) {
    console.log('Saving invoice to database:', invoiceData.invoiceNumber);
    return Promise.resolve();
  }
}

// Export as ES module default export
export default new InvoiceService();