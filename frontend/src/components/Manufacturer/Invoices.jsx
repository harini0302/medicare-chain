// src/pages/Manufacturer/Invoices.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate,useLocation } from 'react-router-dom';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import { 
  Eye, 
  Download, 
  Mail, 
  CheckCircle, 
  Clock, 
  FileText, 
  Filter, 
  RefreshCw,
  Plus,
  Search,
  XCircle,
  DollarSign,
  User,
  Bell,
  LayoutDashboard,
  Package,
  Truck,
  Ship,
  Zap,
  ShoppingCart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import logo from '../../assets/logo.png';

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Sidebar Component
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Package, label: "Inventory Management", id: "inventory" },
    { icon: ClipboardList, label: "Order Management", id: "orders" },
    { icon: FileText, label: "Invoices", id: "invoices" },
    { icon: Truck, label: "Dispatch & Tracking", id: "dispatch" },
    { icon: FileText, label: "Reports & Compliance", id: "reports" },
  ];

  const bottomItems = [
    { icon: Mail, label: "Emails", id: "emails" },
    { icon: Ship, label: "Shipment", id: "shipment" },
    { icon: Zap, label: "Integration", id: "integration" },
  ];

  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/invoices')) return 'invoices';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'invoices'; // Default to invoices
  };

  const activeItem = getActiveItem();

  const handleNavigation = (itemId) => {
    setIsMobileMenuOpen(false);
    switch(itemId) {
      case 'dashboard':
        navigate('/manufacturer/dashboard');
        break;
      case 'inventory':
        navigate('/manufacturer/inventory');
        break;
      case 'orders':
        navigate('/manufacturer/orders');
        break;
      case 'invoices':
        navigate('/manufacturer/invoices');
        break;
      case 'dispatch':
        navigate('/manufacturer/dispatch');
        break;
      case 'reports':
        navigate('/manufacturer/reports');
        break;
      default:
        navigate('/manufacturer/dashboard');
    }
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userToken');
    navigate('/');
  };

  // Mobile sidebar overlay
  const MobileOverlay = () => (
    <div 
      className={cn(
        "lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300",
        isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={() => setIsMobileMenuOpen(false)}
    />
  );

  // Sidebar content component
  const SidebarContent = ({ mobile = false }) => (
    <div className={cn(
      "bg-white border-r border-gray-200 shadow-lg flex flex-col h-full",
      mobile 
        ? "fixed left-0 top-0 z-50 w-64 h-screen transform transition-transform duration-300 ease-in-out" 
        : "w-64",
      mobile && (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
    )}>
      {/* Logo and Close Button for Mobile */}
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="Manufacturer Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-semibold text-gray-800">MediVerse</span>
        </div>
        {mobile && (
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Navigation */}
       <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer",
              activeItem === item.id
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <nav className="px-3 py-4 space-y-1 border-t border-gray-100">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <MobileOverlay />
      
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <SidebarContent mobile={true} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>
    </>
  );
};

// Main ManufacturerInvoices Component
const ManufacturerInvoices = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sentFilter, setSentFilter] = useState('all');
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (invoiceId) {
      handleViewInvoice(invoiceId);
    } else {
      fetchInvoices();
    }
  }, [filter, sentFilter, invoiceId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('userData'));
      const token = localStorage.getItem('token');
      
      let url = `http://localhost:8080/api/invoices/manufacturer/${userData.id}`;
      
      const queryParams = [];
      if (filter !== 'all') queryParams.push(`status=${filter}`);
      if (sentFilter !== 'all') queryParams.push(`sent=${sentFilter}`);
      
      if (searchTerm) {
        queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      console.log('📋 Fetching Pharma invoices from:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Pharma invoices received:', response.data.data);
      setInvoices(response.data.data || []);
      
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId) => {
    setSelectedInvoice(invoiceId);
    setShowInvoice(true);
  };

  const handleBackToList = () => {
    setShowInvoice(false);
    setSelectedInvoice(null);
  };

  const handleApproveInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to approve this invoice? It will be sent to the wholesaler.')) {
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
        alert('Invoice approved and sent successfully!');
        fetchInvoices(); // Refresh list
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert(error.response?.data?.message || 'Error approving invoice');
    }
  };

  const handleBulkAction = async () => {
    if (selectedInvoices.size === 0) {
      alert('Please select at least one invoice');
      return;
    }
    
    if (!bulkAction) {
      alert('Please select an action');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const invoiceIds = Array.from(selectedInvoices);
      
      if (bulkAction === 'approve') {
        const confirmMsg = `Are you sure you want to approve ${invoiceIds.length} invoice(s)?`;
        if (!window.confirm(confirmMsg)) return;
        
        // Approve each invoice
        for (const id of invoiceIds) {
          await axios.post(
            `http://localhost:8080/api/invoices/${id}/approve`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        alert(`${invoiceIds.length} invoice(s) approved successfully!`);
      }
      
      // Clear selections
      setSelectedInvoices(new Set());
      setBulkAction('');
      fetchInvoices();
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing bulk action');
    }
  };

  const toggleSelectInvoice = (invoiceId) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <DollarSign className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // In ManufacturerInvoices.jsx, when showing invoice view
  if (showInvoice && selectedInvoice) {
    return (
      <div className="flex h-screen w-screen bg-white">
        <Sidebar />
        <div className="flex-1 w-full bg-white p-4 lg:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto print-container">
            <div className="no-print flex justify-between items-center mb-6">
              <button 
                onClick={handleBackToList} 
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
              >
                ← Back to Invoices
              </button>
              <div className="space-x-3">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Print Invoice
                </button>
                <a
                  href={`http://localhost:8080/api/invoices/${selectedInvoice}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  Download PDF
                </a>
              </div>
            </div>
            <InvoiceTemplate invoiceId={selectedInvoice} />
          </div>
        </div>
      </div>
    );
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.wholesaler_business_name?.toLowerCase().includes(searchLower) ||
      invoice.wholesaler_email?.toLowerCase().includes(searchLower) ||
      invoice.total_amount?.toString().includes(searchTerm)
    );
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === 'draft' || inv.status === 'approved')
    .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const sentInvoices = invoices.filter(i => i.is_sent === 1).length;

  // Stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    approved: invoices.filter(i => i.status === 'approved').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
    totalRevenue: totalAmount,
    pendingAmount: pendingAmount,
    sent: sentInvoices
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 w-full bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm p-4 lg:p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Invoice Management</h1>
                <p className="text-gray-600 text-sm mt-1">Manage and track all your invoices</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                onClick={fetchInvoices}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors border border-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                to="/manufacturer/create-invoice"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </Link>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="mt-4 md:hidden">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {/* Total Invoices Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Total Invoices</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
              <p className="text-gray-500 text-xs lg:text-sm">All invoices created</p>
            </div>

            {/* Draft Invoices Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Draft</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.draft}</div>
              <p className="text-gray-500 text-xs lg:text-sm">Awaiting approval</p>
            </div>

            {/* Sent Invoices Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Sent</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.sent}</div>
              <p className="text-gray-500 text-xs lg:text-sm">Sent to wholesalers</p>
            </div>

            {/* Total Revenue Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Total Revenue</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-gray-500 text-xs lg:text-sm">From all invoices</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 lg:p-6">
              <h4 className="text-blue-700 text-sm font-medium mb-2">Pending Amount</h4>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900">{formatCurrency(stats.pendingAmount)}</div>
              <p className="text-blue-600 text-sm mt-2">From draft and approved invoices</p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 lg:p-6">
              <h4 className="text-green-700 text-sm font-medium mb-2">Average Invoice</h4>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                {invoices.length > 0 ? formatCurrency(stats.totalRevenue / invoices.length) : '₹0.00'}
              </div>
              <p className="text-green-600 text-sm mt-2">Average invoice value</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Invoice #, Wholesaler, or Amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Sent Filter */}
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <select
                    value={sentFilter}
                    onChange={(e) => setSentFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Sent Status</option>
                    <option value="sent">Sent</option>
                    <option value="not_sent">Not Sent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedInvoices.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-blue-700">
                      {selectedInvoices.size} invoice(s) selected
                    </span>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select action</option>
                      <option value="approve">Approve & Send</option>
                      <option value="download">Download PDFs</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setSelectedInvoices(new Set())}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoices Table - Full Height */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm flex-1 min-h-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 text-lg">No invoices found</p>
                <p className="text-gray-500 mt-1">
                  {searchTerm || filter !== 'all' || sentFilter !== 'all'
                    ? 'Try adjusting your search or filter' 
                    : 'Create your first invoice to get started'}
                </p>
                <Link
                  to="/manufacturer/create-invoice"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create New Invoice
                </Link>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="overflow-x-auto flex-1 min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 bg-gray-100"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wholesaler
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.has(invoice.id)}
                              onChange={() => toggleSelectInvoice(invoice.id)}
                              className="rounded border-gray-300 bg-gray-100"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium text-gray-900 font-mono">
                                {invoice.invoice_number}
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoice.items_count || 0} items
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.wholesaler_business_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">{invoice.wholesaler_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(invoice.invoice_date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Due: {formatDate(invoice.due_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              {formatCurrency(invoice.total_amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Tax: {formatCurrency(invoice.gst_total || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.is_sent ? (
                              <div className="flex flex-col">
                                <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Sent
                                </span>
                                <span className="text-xs text-gray-500">
                                  {invoice.sent_at ? formatDate(invoice.sent_at) : 'Recently'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-yellow-600 text-sm font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Not Sent
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewInvoice(invoice.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors border border-gray-300"
                                title="View Invoice"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              
                              {invoice.pdf_path && (
                                <a
                                  href={`http://localhost:8080/api/invoices/${invoice.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                  PDF
                                </a>
                              )}
                              
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => handleApproveInvoice(invoice.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
                                  title="Approve & Send"
                                >
                                  <Mail className="w-4 h-4" />
                                  Send
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-4 py-3 border-t border-gray-200 shrink-0">
                    <div className="text-sm text-gray-500">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredInvoices.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredInvoices.length}</span> invoices
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturerInvoices;