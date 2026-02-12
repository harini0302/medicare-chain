import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, Plus, X } from 'lucide-react';

const API_BASE_URL = "http://localhost:8080/api";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('Cash');
  const [notes, setNotes] = useState('Thank you for the Business!');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchWholesalers();
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      
      // ✅ FIXED: Use correct endpoint to get manufacturer's products
      const response = await axios.get(
        `${API_BASE_URL}/medicines?user_email=${encodeURIComponent(userData.email)}`
      );
      
      console.log('📦 Products fetched:', response.data);
      setProducts(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      alert('Error fetching products');
    }
  };

  const fetchWholesalers = async () => {
    try {
      // ✅ FIXED: Use correct endpoint to get wholesalers
      const response = await axios.get(`${API_BASE_URL}/wholesalers`);
      
      console.log('🏪 Wholesalers fetched:', response.data.wholesalers);
      setWholesalers(response.data.wholesalers || []);
    } catch (error) {
      console.error('❌ Error fetching wholesalers:', error);
      alert('Error fetching wholesalers');
    }
  };

  const addProductToInvoice = (product) => {
    const existing = selectedProducts.find(p => p.productId === product.id);
    
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p.productId === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          rate: parseFloat(product.unit_price),
          gst: parseFloat(product.tax_rate) || 18,
          discount: 0,
          quantity: 1,
          unit: product.unit || 'pcs',
          amount: parseFloat(product.unit_price)
        }
      ]);
    }
  };

  const updateProductField = (productId, field, value) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.productId === productId) {
          const updatedProduct = { ...p, [field]: value };
          
          // Recalculate amount when rate, quantity, gst, or discount changes
          if (['rate', 'quantity', 'gst', 'discount'].includes(field)) {
            const subtotal = updatedProduct.rate * updatedProduct.quantity;
            const discountAmount = subtotal * (updatedProduct.discount / 100);
            const taxableAmount = subtotal - discountAmount;
            const gstAmount = taxableAmount * (updatedProduct.gst / 100);
            updatedProduct.amount = taxableAmount + gstAmount;
          }
          
          return updatedProduct;
        }
        return p;
      })
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, p) => sum + (p.rate * p.quantity), 0);
    const totalDiscount = selectedProducts.reduce((sum, p) => sum + ((p.rate * p.quantity) * (p.discount / 100)), 0);
    const taxableAmount = subtotal - totalDiscount;
    const totalGST = selectedProducts.reduce((sum, p) => {
      const productSubtotal = p.rate * p.quantity;
      const productDiscount = productSubtotal * (p.discount / 100);
      const productTaxable = productSubtotal - productDiscount;
      return sum + (productTaxable * (p.gst / 100));
    }, 0);
    const total = taxableAmount + totalGST;
    
    return { subtotal, totalDiscount, taxableAmount, totalGST, total };
  };

  const createInvoice = async () => {
    if (!selectedWholesaler) {
      alert('Please select a wholesaler');
      return;
    }
    
    if (selectedProducts.length === 0) {
      alert('Please add at least one product');
      return;
    }
    
    setLoading(true);
    
    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData?.id) {
        alert('Please login again');
        return;
      }
      
      console.log('📝 Creating invoice with data:', {
        manufacturerId: userData.id,
        wholesalerId: selectedWholesaler,
        items: selectedProducts
      });
      
      // ✅ FIXED: Send correct data structure to backend
      const invoiceData = {
        manufacturerId: userData.id,
        wholesalerId: parseInt(selectedWholesaler),
        items: selectedProducts.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          batchNumber: `BATCH-${Math.floor(Math.random() * 1000)}` // You can make this dynamic
        })),
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        paymentTerms: `Payment due by ${dueDate}`,
        notes: notes
      };
      
      console.log('📤 Sending to API:', invoiceData);
      
      const response = await axios.post(
        `${API_BASE_URL}/invoices/create`, 
        invoiceData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Invoice creation response:', response.data);
      
      if (response.data.success) {
        alert(`✅ Invoice created successfully! Invoice #: ${response.data.data.invoiceNumber}`);
        navigate('/manufacturer/invoices');
      }
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      
      // Better error message
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else if (error.message) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Error creating invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const { subtotal, totalDiscount, taxableAmount, totalGST, total } = calculateTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create New Invoice</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={printInvoice}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Printer size={20} />
            Print
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Details & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header Details */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Wholesaler Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Bill To (Select Wholesaler)</h2>
            <select
              value={selectedWholesaler}
              onChange={(e) => setSelectedWholesaler(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4"
            >
              <option value="">Choose a wholesaler</option>
              {wholesalers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.businessName || w.fullName} - {w.email}
                </option>
              ))}
            </select>
            
            {selectedWholesaler && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">
                  Selected: {wholesalers.find(w => w.id == selectedWholesaler)?.businessName}
                </p>
                <p className="text-gray-600">
                  Email: {wholesalers.find(w => w.id == selectedWholesaler)?.email}
                </p>
              </div>
            )}
          </div>
          
          {/* Product Search & Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Products</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 border rounded"
                />
                <button
                  onClick={fetchProducts}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Search
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {products.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No products found. Add products in inventory first.
                </div>
              ) : (
                products.map(product => (
                  <div key={product.id} className="border rounded p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                        <p className="text-sm text-gray-600">
                          Stock: {product.stock_qty} {product.unit}
                        </p>
                        <p className="text-sm text-gray-600">Price: ₹{product.unit_price}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{product.unit_price}</p>
                        <p className="text-sm">GST: {product.tax_rate}%</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addProductToInvoice(product)}
                      disabled={product.stock_qty === 0}
                      className={`mt-3 w-full py-2 rounded flex items-center justify-center gap-2 ${
                        product.stock_qty === 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      <Plus size={20} />
                      {product.stock_qty === 0 ? 'Out of Stock' : 'Add to Invoice'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Invoice Preview & Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Selected Products */}
          <div className="bg-white p-6 rounded-lg shadow sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Selected Products ({selectedProducts.length})</h2>
            
            {selectedProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No products added</p>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {selectedProducts.map(product => (
                    <div key={product.productId} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="text-xs text-gray-600">Rate (₹)</label>
                              <input
                                type="number"
                                value={product.rate}
                                onChange={(e) => updateProductField(product.productId, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-full p-1 border rounded text-sm"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Qty</label>
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => updateProductField(product.productId, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full p-1 border rounded text-sm"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">GST %</label>
                              <input
                                type="number"
                                value={product.gst}
                                onChange={(e) => updateProductField(product.productId, 'gst', parseFloat(e.target.value) || 0)}
                                className="w-full p-1 border rounded text-sm"
                                min="0"
                                max="100"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Disc %</label>
                              <input
                                type="number"
                                value={product.discount}
                                onChange={(e) => updateProductField(product.productId, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full p-1 border rounded text-sm"
                                min="0"
                                max="100"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeProduct(product.productId)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <p className="text-right mt-2 font-medium">₹{product.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                {/* Totals */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-₹{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span>₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{totalGST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Notes Input */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    rows="3"
                    placeholder="Thank you for the Business!"
                  />
                </div>
                
                {/* Create Invoice Button */}
                <button
                  onClick={createInvoice}
                  disabled={loading || !selectedWholesaler || selectedProducts.length === 0}
                  className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Invoice...
                    </>
                  ) : (
                    'Create Invoice (Draft)'
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Invoice will be created as draft. You can approve and send it later.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;