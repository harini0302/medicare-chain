// WholesalerInvoices.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import axios from 'axios';

const WholesalerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'approved', 'paid', 'pending'

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
      if (!userData?.id) {
        console.error('No user data found');
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      let url = `http://localhost:8080/api/invoices/wholesaler/${userData.id}`;
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setInvoices(response.data.data);
      } else {
        console.error('API error:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Download the PDF
      const response = await axios.get(
        `http://localhost:8080/api/invoices/${invoiceId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob' // Important for file download
        }
      );
      
      // Create blob URL for download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const handleViewInvoice = (invoiceId) => {
    // Open in new tab
    window.open(`http://localhost:8080/api/invoices/${invoiceId}/download`, '_blank');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-500/20 text-gray-400', label: 'Draft' },
      'approved': { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
      'paid': { color: 'bg-blue-500/20 text-blue-400', label: 'Paid' },
      'pending': { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      'rejected': { color: 'bg-red-500/20 text-red-400', label: 'Rejected' }
    };
    
    const config = statusConfig[status.toLowerCase()] || { color: 'bg-gray-500/20 text-gray-400', label: status };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        
        <div className="flex items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
            {['all', 'approved', 'paid', 'pending', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${
                  filter === status
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh invoices"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">No invoices found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {filter === 'all' 
              ? "You don't have any invoices yet. Invoices will appear here when manufacturers create them."
              : `No ${filter} invoices found. Try selecting a different filter.`
            }
          </p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Manufacturer
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="py-4 px-6 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="hover:bg-gray-750/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="text-white font-medium">{invoice.invoice_number}</div>
                        {invoice.order_id && (
                          <div className="text-xs text-gray-400 mt-1">
                            Order: {invoice.order_id}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white">
                          {invoice.manufacturer_business_name || 'Manufacturer'}
                        </div>
                        {invoice.manufacturer_email && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            {invoice.manufacturer_email}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-300">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white font-semibold">
                          ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          ₹{parseFloat(invoice.subtotal || 0).toFixed(2)} + ₹{parseFloat(invoice.gst_total || 0).toFixed(2)} GST
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-300">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'N/A'}
                        </div>
                        {invoice.due_date && (
                          <div className={`text-xs mt-1 ${
                            new Date(invoice.due_date) < new Date()
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}>
                            {new Date(invoice.due_date) < new Date() ? 'Overdue' : 'Due'}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewInvoice(invoice.id)}
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                            title="View Invoice"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          {invoice.pdf_path && (
                            <button
                              onClick={() => window.open(`http://localhost:8080${invoice.pdf_path}`, '_blank')}
                              className="p-2 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors"
                              title="Open PDF"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Total Invoices</div>
              <div className="text-2xl font-bold text-white mt-1">{invoices.length}</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Total Amount</div>
              <div className="text-2xl font-bold text-white mt-1">
                ₹{invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Pending Amount</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">
                ₹{invoices
                  .filter(inv => inv.status !== 'paid')
                  .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
                  .toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WholesalerInvoices;