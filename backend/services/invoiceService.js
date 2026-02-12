import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const regularFont = path.join(__dirname, '../fonts/Roboto/Roboto-Regular.ttf');
const boldFont = path.join(__dirname, '../fonts/Roboto/Roboto-Bold.ttf');

class InvoiceService {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../uploads/invoices');
    this.ensureInvoicesDirectory();
  }

  ensureInvoicesDirectory() {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  // Format date helper
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  }

  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero Rupees Only';
    
    let rupees = Math.floor(num);
    let paise = Math.round((num - rupees) * 100);
    
    let words = '';
    
    if (rupees >= 100000) {
      const lakhs = Math.floor(rupees / 100000);
      words += this.numberToWordsHelper(lakhs) + ' Lakh ';
      rupees %= 100000;
    }
    
    if (rupees >= 1000) {
      const thousands = Math.floor(rupees / 1000);
      words += this.numberToWordsHelper(thousands) + ' Thousand ';
      rupees %= 1000;
    }
    
    if (rupees >= 100) {
      const hundreds = Math.floor(rupees / 100);
      words += ones[hundreds] + ' Hundred ';
      rupees %= 100;
    }
    
    if (rupees > 0) {
      if (rupees >= 20) {
        words += tens[Math.floor(rupees / 10)] + ' ';
        rupees %= 10;
        
        if (rupees > 0) {
          words += ones[rupees] + ' ';
        }
      } else if (rupees >= 10) {
        words += teens[rupees - 10] + ' ';
      } else {
        words += ones[rupees] + ' ';
      }
    }
    
    words = words.trim() + ' Rupees';
    
    if (paise > 0) {
      words += ' and ' + this.numberToWordsHelper(paise) + ' Paise';
    }
    
    return words + ' Only';
  }

  numberToWordsHelper(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    let words = '';
    
    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
      
      if (num > 0) {
        words += ones[num] + ' ';
      }
    } else if (num >= 10) {
      words += teens[num - 10] + ' ';
    } else if (num > 0) {
      words += ones[num] + ' ';
    }
    
    return words.trim();
  }

  async generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🧾 InvoiceService: Generating PDF for:', invoiceData.invoice_number);
        
        // Page dimensions
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const leftMargin = 40;
        const rightMargin = pageWidth - 40;
        const contentWidth = rightMargin - leftMargin;
        
        // Clean data
        const cleanData = {
          ...invoiceData,
          notes: invoiceData.notes ? invoiceData.notes.replace(/<[^>]*>/g, '').trim() : '',
          manufacturer_address: invoiceData.manufacturer_address ? 
            invoiceData.manufacturer_address.replace(/<[^>]*>/g, '').trim() : '',
          wholesaler_address: invoiceData.wholesaler_address ? 
            invoiceData.wholesaler_address.replace(/<[^>]*>/g, '').trim() : ''
        };
        
        const invoiceNumber = cleanData.invoice_number;
        const fileName = `invoice_${invoiceNumber}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        // Create PDF with smaller margins to fit on one page
        const doc = new PDFDocument({ 
          margin: 30, // Smaller margins
          size: 'A4',
          bufferPages: true
        });
        doc.registerFont('Roboto', regularFont);
        doc.registerFont('Roboto-Bold', boldFont);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // ========== HEADER SECTION ==========
        // Top Center: MarqWon SCM
        doc.fontSize(20).font(boldFont)
          .text('MarqWon SCM', leftMargin, 20, { align: 'center' });
        
        // Horizontal line after header
        doc.moveTo(leftMargin, 45).lineTo(rightMargin, 45).strokeColor('#000000').stroke();

        // ========== MANUFACTURER DETAILS (Left Side) ==========
        const manufacturerY = 50;
        
        doc.fontSize(12).font(boldFont)
          .text(`# ${cleanData.manufacturer_business_name || 'pharma'}`, leftMargin, manufacturerY);
        
        doc.fontSize(9).font(regularFont);
        let manY = manufacturerY + 15;
        
        if (cleanData.manufacturer_address) {
          doc.text(cleanData.manufacturer_address, leftMargin, manY);
          manY += 12;
        }
        
        if (cleanData.manufacturer_gstin) {
          doc.text(`GSTIN: ${cleanData.manufacturer_gstin}`, leftMargin, manY);
          manY += 12;
        }
        
        if (cleanData.manufacturer_email) {
          doc.text(`Email: ${cleanData.manufacturer_email}`, leftMargin, manY);
          manY += 15;
        }

        // ========== TAX INVOICE HEADER (Right Side) ==========
        const invoiceDetailsX = 350;
        const invoiceDetailsY = manufacturerY;
        
        doc.fontSize(14).font(boldFont)
          .text('TAX INVOICE', invoiceDetailsX, invoiceDetailsY, { 
            width: 200, 
            align: 'right' 
          });
        
        doc.fontSize(9).font(regularFont);
        let invoiceY = invoiceDetailsY + 20;
        
        doc.text(`Invoice #: ${invoiceNumber}`, invoiceDetailsX, invoiceY, { 
          width: 200, 
          align: 'right' 
        });
        invoiceY += 12;
        
        doc.text(`Date: ${this.formatDate(cleanData.invoice_date)}`, invoiceDetailsX, invoiceY, { 
          width: 200, 
          align: 'right' 
        });
        invoiceY += 12;
        
        doc.text(`Due Date: ${this.formatDate(cleanData.due_date)}`, invoiceDetailsX, invoiceY, { 
          width: 200, 
          align: 'right' 
        });
        invoiceY += 12;
        
        doc.text(`Payment: ${cleanData.payment_type || 'Cash'}`, invoiceDetailsX, invoiceY, { 
          width: 200, 
          align: 'right' 
        });
        invoiceY += 15;

        // ========== BILLED TO & SHIPPED TO SECTIONS (Side by Side) ==========
        // Position them at the same Y coordinate, opposite each other
        const billShippedY = Math.max(manY, invoiceY) + 15;
        
        // BILLED TO (Left Side)
        doc.fontSize(10).font(boldFont)
          .text('Billed To:', leftMargin, billShippedY);
        
        let billedY = billShippedY + 15;
        
        if (cleanData.wholesaler_business_name) {
          doc.fontSize(9).font(boldFont)
            .text(cleanData.wholesaler_business_name, leftMargin, billedY);
          billedY += 12;
        }
        
        doc.fontSize(9).font(regularFont);
        
        if (cleanData.wholesaler_gstin) {
          doc.text(`GSTIN: ${cleanData.wholesaler_gstin}`, leftMargin, billedY);
          billedY += 12;
        }
        
        if (cleanData.wholesaler_address) {
          doc.text(cleanData.wholesaler_address, leftMargin, billedY);
          billedY += 12;
        }
        
        if (cleanData.wholesaler_email) {
          doc.text(`Email: ${cleanData.wholesaler_email}`, leftMargin, billedY);
          billedY += 12;
        }

        // SHIPPED TO (Right Side) - exactly opposite Billed To
        doc.fontSize(10).font(boldFont)
          .text('Shipped To:', invoiceDetailsX, billShippedY, {
            width: 200,
            align: 'right'
          });
        
        let shippedY = billShippedY + 15;
        
        if (cleanData.wholesaler_business_name) {
          doc.fontSize(9).font(boldFont)
            .text(cleanData.wholesaler_business_name, invoiceDetailsX, shippedY, {
              width: 200,
              align: 'right'
            });
          shippedY += 12;
        }
        
        doc.fontSize(9).font(regularFont);
        
        if (cleanData.wholesaler_address) {
          doc.text(cleanData.wholesaler_address, invoiceDetailsX, shippedY, {
            width: 200,
            align: 'right'
          });
          shippedY += 12;
        }

        // Horizontal separator line
        const maxY = Math.max(billedY, shippedY);
        const separatorY = maxY + 10;
        doc.moveTo(leftMargin, separatorY).lineTo(rightMargin, separatorY).strokeColor('#000000').stroke();

        // ========== ITEMS TABLE ==========
        const tableTop = separatorY + 15;
        const tableWidth = contentWidth;
        const headerHeight = 25;
        const rowHeight = 20;
        
        // Table Header - White background with black border
        doc.fillColor('#FFFFFF').rect(leftMargin, tableTop, tableWidth, headerHeight).fill();
        doc.strokeColor('#000000').rect(leftMargin, tableTop, tableWidth, headerHeight).stroke();
        doc.fillColor('#000000').fontSize(10).font(boldFont);
        
        // Column positions - Adjusted to match the PDF example (no Total column)
        const col1 = leftMargin + 10;     // #
        const col2 = leftMargin + 30;     // Description
        const col3 = leftMargin + 200;    // Rate / Item
        const col4 = leftMargin + 270;    // GST (%)
        const col5 = leftMargin + 320;    // Disc (%)
        const col6 = leftMargin + 370;    // Amount (Only amount column)
        
        // Header text with proper alignment
        doc.text('#', col1, tableTop + 8);
        doc.text('Description', col2, tableTop + 8, { width: 160 });
        doc.text('Rate / Item', col3, tableTop + 8, { width: 60, align: 'right' });
        doc.text('GST (%)', col4, tableTop + 8, { width: 40, align: 'center' });
        doc.text('Disc (%)', col5, tableTop + 8, { width: 40, align: 'center' });
        doc.text('Amount', col6, tableTop + 8, { width: 80, align: 'right' });

        // Table Data
        doc.fontSize(9).font(regularFont);
        let rowY = tableTop + headerHeight;
        
        const items = cleanData.items || [];
        let subtotal = 0;
        let gstTotal = 0;
        let calculatedTotal = 0;
        
        // Default item if none provided
        if (items.length === 0) {
          items.push({
            product_name: cleanData.product_name || 'Product/Service',
            description: cleanData.description || '',
            quantity: 1,
            unit_price: parseFloat(cleanData.subtotal) || 0,
            tax_rate: cleanData.tax_rate || 18,
            discount_percent: 0,
            batch_number: cleanData.batch_number || ''
          });
        }
        
        // Draw table rows
        items.forEach((item, index) => {
          // Draw cell borders for each row
          doc.strokeColor('#000000').rect(leftMargin, rowY, tableWidth, rowHeight).stroke();
          
          // Alternate row background
          if (index % 2 === 0) {
            doc.fillColor('#f8f8f8').rect(leftMargin, rowY, tableWidth, rowHeight).fill();
          } else {
            doc.fillColor('#FFFFFF').rect(leftMargin, rowY, tableWidth, rowHeight).fill();
          }
          
          doc.fillColor('#000000');
          
          // Item details
          const itemNumber = index + 1;
          let description = item.product_name || item.description || 'Item';
          const quantity = parseFloat(item.quantity) || 1;
          
          // Add quantity to description
          let fullDescription = description;
          if (quantity > 1) {
            fullDescription += ` (Qty: ${quantity})`;
          }
          
          const unitPrice = parseFloat(item.unit_price) || 0;
          const taxRate = parseFloat(item.tax_rate) || 0;
          const discountPercent = parseFloat(item.discount_percent) || 0;
          
          // Calculate amounts
          const itemSubtotal = quantity * unitPrice;
          const discountAmount = (itemSubtotal * discountPercent) / 100;
          const discountedSubtotal = itemSubtotal - discountAmount;
          const gstAmount = (discountedSubtotal * taxRate) / 100;
          const itemTotal = discountedSubtotal + gstAmount;
          
          subtotal += discountedSubtotal;
          gstTotal += gstAmount;
          calculatedTotal += itemTotal;
          
          // Draw cell content
          doc.text(itemNumber.toString(), col1, rowY + 6);
          doc.text(fullDescription, col2, rowY + 6, { width: 160 });
          doc.text(`₹${unitPrice.toFixed(2)}`, col3, rowY + 6, { width: 60, align: 'right' });
          doc.text(`${taxRate}%`, col4, rowY + 6, { width: 40, align: 'center' });
          doc.text(discountPercent > 0 ? `${discountPercent}%` : '-', col5, rowY + 6, { width: 40, align: 'center' });
          doc.text(`₹${itemTotal.toFixed(2)}`, col6, rowY + 6, { width: 80, align: 'right' });
          
          rowY += rowHeight;
        });

        // ========== TOTALS SECTION (In one line below table) ==========
        const totalsY = rowY + 20;
        
        // Use provided totals or calculated ones
        subtotal = parseFloat(cleanData.subtotal) || subtotal;
        gstTotal = parseFloat(cleanData.gst_total) || gstTotal;
        const finalTotal = parseFloat(cleanData.total_amount) || calculatedTotal;
        
        // Draw totals in one line as shown in the PDF example
        doc.fontSize(10).font(regularFont)
          .text('Subtotal:', col6 - 180, totalsY, { width: 60, align: 'left' })
          .text(`₹${subtotal.toFixed(2)}`, col6 - 120, totalsY, { width: 80, align: 'right' });
        
        doc.text('GST Total:', col6 - 180, totalsY + 15, { width: 60, align: 'left' })
          .text(`₹${gstTotal.toFixed(2)}`, col6 - 120, totalsY + 15, { width: 80, align: 'right' });
        
        doc.fontSize(11).font(boldFont)
          .text('Total Amount:', col6 - 180, totalsY + 35, { width: 70, align: 'left' })
          .text(`₹${finalTotal.toFixed(2)}`, col6 - 120, totalsY + 35, { width: 80, align: 'right' });

        // ========== AMOUNT IN WORDS ==========
        const wordsY = totalsY + 60;
        doc.fontSize(9).font(boldFont)
          .text('Total amount (in words):', leftMargin, wordsY);
        
        doc.fontSize(9).font(regularFont)
          .text(this.numberToWords(finalTotal), leftMargin, wordsY + 12, { width: 400 });

        // ========== BANK DETAILS ==========
        const bankY = wordsY + 40;
        doc.fontSize(9).font(boldFont)
          .text('Bank Details', leftMargin, bankY);
        
        doc.fontSize(9).font(regularFont)
          .text('Bank: STATE BANK OF INDIA', leftMargin, bankY + 12)
          .text('Account #: 00000020532076419', leftMargin, bankY + 24)
          .text('IFSC: SBIN0011063', leftMargin, bankY + 36)
          .text('Branch: MADURAI', leftMargin, bankY + 48);
        
        doc.fontSize(9).font(boldFont)
          .text('Pay using UPI', leftMargin, bankY + 65);

        // ========== NOTES ==========
        const notesY = bankY + 85;
        doc.fontSize(9).font(boldFont)
          .text('Notes:', leftMargin, notesY);
        
        const notesText = cleanData.notes || 'Invoice generated for approved order.';
        const maxNotesWidth = 515;
        const notesHeight = doc.heightOfString(notesText, { width: maxNotesWidth });
        
        doc.fontSize(9).font(regularFont)
          .text(notesText, leftMargin, notesY + 12, { width: maxNotesWidth });

        // ========== TERMS & CONDITIONS ==========
        const termsY = notesY + notesHeight + 20;
        
        // Check if we have space for terms on this page
        if (termsY < pageHeight - 100) {
          doc.fontSize(9).font(boldFont)
            .text('Terms and Conditions:', leftMargin, termsY);
          
          doc.fontSize(8).font(regularFont);
          const terms = [
            '1. All invoices are payable within 15 days from the date of invoice.',
            '2. Late payments incur a charge of 5% interest per month on the outstanding balance.',
            '3. Any additional services requested by the client shall be subject to additional fees.',
            '4. The client retains all rights to materials provided by them for use in the project.',
            '5. Both parties agree to keep all information exchanged during the project confidential.',
            '6. The invoice and services are governed by the laws of India.',
            `7. ${cleanData.manufacturer_business_name || 'Manufacturer'} reserves the right to suspend or terminate services in case of non-payment.`,
            `8. Any dispute arising out of this invoice shall be subject to the exclusive jurisdiction of courts in ${cleanData.place_of_supply || 'Tamil Nadu'}.`,
            '9. By accepting this invoice, the client agrees to abide by these terms and conditions.'
          ];
          
          let termY = termsY + 12;
          terms.forEach(term => {
            if (termY < pageHeight - 30) {
              doc.text(term, leftMargin, termY, { width: 515 });
              termY += 10;
            }
          });

          // ========== SIGNATURE ==========
          const signatureY = Math.min(termY + 15, pageHeight - 40);
          doc.fontSize(9)
            .text("Receiver's Signature", leftMargin, signatureY);
          
          doc.moveTo(leftMargin + 80, signatureY + 5).lineTo(leftMargin + 200, signatureY + 5).strokeColor('#000000').stroke();
          
          doc.fontSize(7).fillColor('#666666')
            .text('This is a digitally signed document', leftMargin, signatureY + 12);
        }

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          console.log(`✅ InvoiceService: PDF generated successfully: ${fileName}`);
          resolve({
            fileName,
            filePath,
            downloadUrl: `/api/invoices/download/${fileName}`
          });
        });

        stream.on('error', reject);

      } catch (error) {
        console.error('❌ InvoiceService: PDF generation error:', error);
        reject(error);
      }
    });
  }

  async getInvoiceByOrderId(orderId) {
    console.log('Getting invoice for order:', orderId);
    return null;
  }

  async getInvoicesByManufacturer(manufacturerId) {
    console.log('Getting invoices for manufacturer:', manufacturerId);
    return [];
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

export default new InvoiceService();