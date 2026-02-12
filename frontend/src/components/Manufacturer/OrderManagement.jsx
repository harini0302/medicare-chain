import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  FileText, 
  Mail, 
  Ship, 
  Zap, 
  ShoppingCart, 
  LogOut,
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  User,
  Bell,
  ClipboardList
} from 'lucide-react';
import logo from '../../assets/logo.png';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8080/api";

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Sidebar Component for OrderManagement
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Package, label: "Inventory Management", id: "inventory" },
    { icon: ClipboardList, label: "Order Management", id: "orders" },
    { icon: ClipboardList, label: "Invoices", id: "invoices" },
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
    return 'orders'; // Default to orders since we're in OrderManagement
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
              alt="WholesalerLogo" 
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

// Main OrderManagement Component
const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Get user data
  const getUserData = () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  };

  // Fetch orders for the logged-in manufacturer
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const user = getUserData();
      if (!user?.id) {
        console.error('❌ No user ID found');
        navigate('/');
        return;
      }

      console.log('🔍 Fetching orders for manufacturer:', user.id);
      const response = await axios.get(`${API_BASE_URL}/orders/manufacturer/${user.id}`);
      
      if (response.data.success) {
        console.log('✅ Orders fetched:', response.data.orders.length);
        setOrders(response.data.orders);
        
        // Set user email for display
        if (user.email) {
          setUserEmail(user.email);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      alert('Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Listen for order status updates
    const handleOrderStatusUpdated = () => {
      console.log('🔄 Refreshing orders due to status update');
      fetchOrders();
    };
    
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdated);
    
    return () => {
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdated);
    };
  }, []);

  // Get status badge with appropriate styling
  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.wholesaler_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Close order details
  const closeOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  // Statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
    totalRevenue: orders
      .filter(order => order.status === 'approved')
      .reduce((sum, order) => {
        const amount = parseFloat(order.total_amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0)
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-white">
        <Sidebar />
        <div className="flex-1 w-full bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Order Management</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Search Bar - Hidden on mobile */}
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-60 lg:w-80"
                />
              </div>
              
              <button
                onClick={fetchOrders}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="mt-4 md:hidden">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-6 mb-6">
            {/* Total Orders Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Total Orders</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
              <p className="text-gray-500 text-xs lg:text-sm">All received orders</p>
            </div>

            {/* Pending Orders Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Pending</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.pending}</div>
              <p className="text-gray-500 text-xs lg:text-sm">Awaiting your review</p>
            </div>

            {/* Approved Orders Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Approved</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.approved}</div>
              <p className="text-gray-500 text-xs lg:text-sm">Orders accepted</p>
            </div>

            {/* Rejected Orders Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Rejected</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stats.rejected}</div>
              <p className="text-gray-500 text-xs lg:text-sm">Orders declined</p>
            </div>

            {/* Total Revenue Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg font-bold">₹</span>
                  </div>
                  <h3 className="text-gray-900 text-sm lg:text-base font-medium">Total Revenue</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">
                From approved orders
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Product, or Wholesaler..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table - Full Height */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm flex-1 min-h-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 text-lg">No orders found</p>
                <p className="text-gray-500 mt-1">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter' 
                    : 'No orders have been placed yet'}
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="overflow-x-auto flex-1 min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wholesaler
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 font-mono">
                              {order.order_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{order.product_name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{order.wholesaler_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{order.quantity || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(order.total_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.order_date || order.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
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
                        {Math.min(indexOfLastItem, filteredOrders.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredOrders.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                  <button
                    onClick={closeOrderDetails}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-500 text-sm mt-1">Order ID: {selectedOrder.order_id}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Order Status Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Order Status</h4>
                    <div className="mt-2">
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm">Order Date</p>
                    <p className="text-gray-900">{formatDate(selectedOrder.order_date || selectedOrder.created_at)}</p>
                  </div>
                </div>

                {/* Product Information */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Product Name</p>
                      <p className="text-gray-900">{selectedOrder.product_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Quantity</p>
                      <p className="text-gray-900">{selectedOrder.quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Unit Price</p>
                      <p className="text-gray-900">{formatCurrency(selectedOrder.unit_price)}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Wholesaler Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Wholesaler Name</p>
                      <p className="text-gray-900">{selectedOrder.wholesaler_name || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.total_amount - (selectedOrder.gst_amount || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GST ({selectedOrder.gst_percentage || 18}%)</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.gst_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2">
                      <span className="text-gray-700 font-semibold">Total Amount</span>
                      <span className="text-green-600 font-bold text-lg">
                        {formatCurrency(selectedOrder.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {selectedOrder.notes && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-gray-700">{selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-700 mb-2">Rejection Reason</h4>
                    <p className="text-red-600">{selectedOrder.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={closeOrderDetails}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-semibold transition-colors border border-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;