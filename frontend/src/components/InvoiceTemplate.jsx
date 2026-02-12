// src/components/InvoiceTemplate.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Printer, Mail } from 'lucide-react';

const InvoiceTemplate = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `http://localhost:8080/api/invoices/${invoiceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        const invoiceData = response.data.data;
        setInvoice(invoiceData);
        
        // Fetch items if not included
        if (!invoiceData.items || invoiceData.items.length === 0) {
          fetchInvoiceItems(invoiceId);
        } else {
          setItems(invoiceData.items);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceItems = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8080/api/invoices/${id}/items`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero Rupees Only';
    
    let rupees = Math.floor(num);
    let paise = Math.round((num - rupees) * 100);
    
    let words = '';
    
    // Handle lakhs
    if (rupees >= 100000) {
      const lakhs = Math.floor(rupees / 100000);
      words += numberToWordsHelper(lakhs) + ' Lakh ';
      rupees %= 100000;
    }
    
    // Handle thousands
    if (rupees >= 1000) {
      const thousands = Math.floor(rupees / 1000);
      words += numberToWordsHelper(thousands) + ' Thousand ';
      rupees %= 1000;
    }
    
    // Handle hundreds
    if (rupees >= 100) {
      const hundreds = Math.floor(rupees / 100);
      words += ones[hundreds] + ' Hundred ';
      rupees %= 100;
    }
    
    // Handle tens and ones
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
      words += ' and ' + numberToWordsHelper(paise) + ' Paise';
    }
    
    return words + ' Only';
  };

  const numberToWordsHelper = (num) => {
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
  };

  const handleSendEmail = async () => {
    if (!window.confirm('Send this invoice via email to the wholesaler?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8080/api/invoices/${invoiceId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Invoice sent successfully via email!');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert(error.response?.data?.message || 'Error sending invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">MarqWon SCM</h1>
        <div className="h-px bg-gray-300 mb-4"></div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Left Column - Manufacturer Details */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            # {invoice.manufacturer_business_name || 'pharma'}
          </h2>
          <div className="text-gray-700 space-y-2">
            <p>{invoice.manufacturer_address || 'kenikarai'}</p>
            {invoice.manufacturer_gstin && (
              <p>GSTIN: {invoice.manufacturer_gstin}</p>
            )}
            {invoice.manufacturer_email && (
              <p>Email: {invoice.manufacturer_email}</p>
            )}
            {invoice.manufacturer_phone && (
              <p>Phone: {invoice.manufacturer_phone}</p>
            )}
          </div>
        </div>

        {/* Right Column - Invoice Details */}
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800 mb-4">TAX INVOICE</h2>
          <div className="text-gray-700 space-y-2">
            <p>Invoice #: {invoice.invoice_number}</p>
            <p>Date: {formatDate(invoice.invoice_date)}</p>
            <p>Due Date: {formatDate(invoice.due_date)}</p>
            <p>Payment: Cash</p>
          </div>
        </div>
      </div>

      {/* Billed To & Shipped To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Billed To */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-3">Billed To:</h3>
          <div className="text-gray-700 space-y-2">
            <p className="font-medium">{invoice.wholesaler_business_name}</p>
            {invoice.wholesaler_gstin && (
              <p>GSTIN: {invoice.wholesaler_gstin}</p>
            )}
            <p>{invoice.wholesaler_address}</p>
            {invoice.wholesaler_email && (
              <p>Email: {invoice.wholesaler_email}</p>
            )}
          </div>
        </div>

        {/* Shipped To */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-3">Shipped To:</h3>
          <div className="text-gray-700 space-y-2">
            <p className="font-medium">{invoice.wholesaler_business_name}</p>
            <p>{invoice.wholesaler_address}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left font-medium">#</th>
              <th className="border p-3 text-left font-medium">Description</th>
              <th className="border p-3 text-left font-medium">Rate / Item</th>
              <th className="border p-3 text-left font-medium">GST (%)</th>
              <th className="border p-3 text-left font-medium">Disc (%)</th>
              <th className="border p-3 text-left font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border p-3">{index + 1}</td>
                <td className="border p-3">
                  {item.product_name}
                  {item.quantity > 1 && ` (Qty: ${item.quantity})`}
                </td>
                <td className="border p-3">{formatCurrency(item.unit_price)}</td>
                <td className="border p-3 text-center">{item.tax_rate || 18}%</td>
                <td className="border p-3 text-center">-</td>
                <td className="border p-3">{formatCurrency(item.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mb-8 flex justify-end">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-gray-700">GST Total:</span>
            <span className="font-medium">{formatCurrency(invoice.gst_total)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-4 border-t">
            <span>Total Amount:</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <p className="font-medium text-gray-800 mb-2">Total amount (in words):</p>
        <p className="text-gray-700">{numberToWords(invoice.total_amount)}</p>
      </div>

      {/* Bank Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Bank Details</h3>
          <div className="text-gray-700 space-y-2">
            <p>Bank: STATE BANK OF INDIA</p>
            <p>Account #: 00000020532076419</p>
            <p>IFSC: SBIN0011063</p>
            <p>Branch: MADURAI</p>
          </div>
          <div className="mt-4">
            <p className="font-medium text-gray-800">Pay using UPI</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-800 mb-3">Notes</h3>
          <p className="text-gray-700">{invoice.notes || 'Invoice generated for approved order.'}</p>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-800 mb-3">Terms and Conditions:</h3>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>All invoices are payable within 15 days from the date of invoice.</li>
          <li>Late payments incur a charge of 5% interest per month on the outstanding balance.</li>
          <li>Any additional services requested by the client shall be subject to additional fees.</li>
          <li>The client retains all rights to materials provided by them for use in the project.</li>
          <li>Both parties agree to keep all information exchanged during the project confidential.</li>
          <li>The invoice and services are governed by the laws of India.</li>
          <li>{invoice.manufacturer_business_name || 'Manufacturer'} reserves the right to suspend or terminate services in case of non-payment.</li>
          <li>Any dispute arising out of this invoice shall be subject to the exclusive jurisdiction of courts in {invoice.place_of_supply || 'Tamil Nadu'}.</li>
          <li>By accepting this invoice, the client agrees to abide by these terms and conditions.</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="pt-8 border-t">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-gray-800 mb-4">Receiver's Signature</p>
            <div className="h-px w-48 bg-gray-400"></div>
            <p className="text-sm text-gray-500 mt-2">This is a digitally signed document</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Printer size={18} /> Print
            </button>
            <a
              href={`http://localhost:8080/api/invoices/${invoiceId}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={18} /> Download PDF
            </a>
            {invoice.status !== 'approved' && (
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Mail size={18} /> Send via Email
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-6 flex justify-end">
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
          invoice.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          Status: {invoice.status.toUpperCase()}
          {invoice.is_sent && invoice.sent_at && (
            <span className="ml-2 text-xs">
              (Sent on {formatDate(invoice.sent_at)})
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default InvoiceTemplate;