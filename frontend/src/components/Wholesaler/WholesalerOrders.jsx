import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, Bell, Package, Truck, FileText, Mail, Ship, Zap, 
  ShoppingCart, LogOut, Search, Users, ClipboardList, 
  AlertTriangle, Calendar, CheckCircle, Clock, Filter, Download, Eye,
  XCircle, RefreshCw, ChevronDown, ChevronUp, Tag, BarChart,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import axios from 'axios';
import { io } from "socket.io-client";

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Mobile Menu Context
const MobileMenuContext = React.createContext();

const MobileMenuProvider = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ isMobileMenuOpen, setIsMobileMenuOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
};

const useMobileMenu = () => {
  const context = React.useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
};

// Orders Context
const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ORDERS_API = "http://localhost:8080/api/orders";

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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = getUserData();
      if (!user?.id) {
        setError("No user ID found");
        return;
      }

      console.log("🔍 Fetching orders for wholesaler:", user.id);
      const response = await axios.get(`${ORDERS_API}/wholesaler/${user.id}`);
      console.log("✅ Fetched orders:", response.data);
      
      // Handle different response structures
      let ordersData = [];
      
      if (response.data.orders) {
        ordersData = response.data.orders;
      } else if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data.data) {
        ordersData = response.data.data;
      }
      
      // Process orders to ensure consistent field names
      const processedOrders = ordersData.map(order => ({
        ...order,
        // Map different possible field names to expected ones
        id: order.order_id || order.id || `ORD-${Date.now()}`,
        medicine_name: order.medicine_name || order.product_name || order.medicineName || 'N/A',
        manufacturer_name: order.manufacturer_name || order.manufacturerName || 'N/A',
        amount: order.total_amount || order.amount || order.total || 0,
        total_amount: order.total_amount || order.amount || order.total || 0,
        quantity: order.quantity || 0,
        status: (order.status || 'pending').toLowerCase(),
        created_at: order.created_at || order.order_date || order.createdAt || new Date().toISOString(),
        updated_at: order.updated_at || order.updatedAt || order.modified_at,
        rejection_reason: order.rejection_reason || order.rejectionReason,
        notes: order.notes,
        batch_number: order.batch_number || order.batchNumber,
        category: order.category,
        unit_price: order.unit_price || order.unitPrice
      }));
      
      setOrders(processedOrders);
      return processedOrders;
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add this function to calculate order stats
  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(order => order.status === 'pending').length,
      approved: orders.filter(order => order.status === 'approved').length,
      rejected: orders.filter(order => order.status === 'rejected').length,
      processing: orders.filter(order => order.status === 'processing').length,
      shipped: orders.filter(order => order.status === 'shipped').length,
      delivered: orders.filter(order => order.status === 'delivered').length
    };
    return stats;
  };

  return {
    orders,
    loading,
    error,
    fetchOrders,
    getOrderStats
  };
};

const OrdersContext = React.createContext();

const OrdersProvider = ({ children }) => {
  const orders = useOrders();
  
  return (
    <OrdersContext.Provider value={orders}>
      {children}
    </OrdersContext.Provider>
  );
};

const useOrderContext = () => {
  const context = React.useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrderContext must be used within an OrdersProvider');
  }
  return context;
};

// Sidebar Component
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Package, label: "Inventory Management", id: "inventory" },
  { icon: ShoppingCart, label: "Wholesaler Catalog", id: "catalog" },
  { icon: ClipboardList, label: "Order Management", id: "orders" },
  { icon: Truck, label: "Dispatch & Tracking", id: "dispatch" },
  { icon: FileText, label: "Reports & Compliance", id: "reports" },
];

const bottomItems = [
  { icon: Mail, label: "Emails", id: "emails" },
  { icon: Ship, label: "Shipment", id: "shipment" },
  { icon: Zap, label: "Integration", id: "integration" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();
  
  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/catalog')) return 'catalog';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'dashboard';
  };

  const activeItem = getActiveItem();

  const handleNavigation = (itemId) => {
    setIsMobileMenuOpen(false);
    switch(itemId) {
      case 'dashboard':
        navigate('/wholesaler/dashboard');
        break;
      case 'inventory':
        navigate('/wholesaler/inventory');
        break;
      case 'catalog':
        navigate('/wholesaler/catalog');
        break;
      case 'orders':
        navigate('/wholesaler/orders');
        break;
      case 'dispatch':
        navigate('/wholesaler/dispatch');
        break;
      case 'reports':
        navigate('/wholesaler/reports');
        break;
      default:
        navigate('/wholesaler/dashboard');
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
      "bg-gray-900 border-r border-gray-700 flex flex-col h-full",
      mobile 
        ? "fixed left-0 top-0 z-50 w-64 h-screen transform transition-transform duration-300 ease-in-out" 
        : "w-64",
      mobile && (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
    )}>
      {/* Logo and Close Button for Mobile */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="WholesalerLogo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-semibold text-white">MediVerse</span>
        </div>
        {mobile && (
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
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
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <nav className="px-3 py-4 space-y-1 border-t border-gray-700">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-all"
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

// Order Management Component
const OrderManagement = () => {
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { orders, loading, error, fetchOrders, getOrderStats } = useOrderContext();
  const [userEmail, setUserEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Get order stats
  const orderStats = getOrderStats();
  // Replace the existing orderStatistics calculation with this:
const orderStatistics = useMemo(() => {
  const totalOrders = orders.length;
  
  // Calculate total revenue from APPROVED orders only
  const totalRevenue = orders.reduce((sum, order) => {
    // Only count approved orders
    if (order.status === 'approved') {
      const amount = parseFloat(order.total_amount || order.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }
    return sum;
  }, 0);
  
  // Count by status
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const approvedOrders = orders.filter(order => order.status === 'approved').length;
  const rejectedOrders = orders.filter(order => order.status === 'rejected').length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
  
  return {
    totalOrders,
    totalRevenue,
    pendingOrders,
    approvedOrders,
    rejectedOrders,
    deliveredOrders
  };
}, [orders]);
  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id?.toLowerCase().includes(term) ||
        order.medicine_name?.toLowerCase().includes(term) ||
        order.manufacturer_name?.toLowerCase().includes(term)
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.order_date || 0);
      const dateB = new Date(b.created_at || b.order_date || 0);
      
      switch(sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'amount_high':
          return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
        case 'amount_low':
          return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
        default:
          return dateB - dateA;
      }
    });

    return filtered;
  }, [orders, filterStatus, sortBy, searchTerm]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredAndSortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) return '₹0.00';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
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

  // Get status badge style
  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
          icon: <CheckCircle className="w-3 h-3 mr-1" />
        };
      case 'rejected':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
          icon: <XCircle className="w-3 h-3 mr-1" />
        };
      case 'pending':
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          icon: <Clock className="w-3 h-3 mr-1" />
        };
      case 'processing':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          icon: <RefreshCw className="w-3 h-3 mr-1" />
        };
      case 'shipped':
        return {
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          icon: <Truck className="w-3 h-3 mr-1" />
        };
      case 'delivered':
        return {
          bg: 'bg-indigo-500/20',
          text: 'text-indigo-400',
          border: 'border-indigo-500/30',
          icon: <Package className="w-3 h-3 mr-1" />
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
          icon: <Tag className="w-3 h-3 mr-1" />
        };
    }
  };

  // Calculate total value of filtered orders
  const totalFilteredValue = filteredAndSortedOrders.reduce((total, order) => {
    const amount = parseFloat(order.total_amount || order.amount || 0);
    return total + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Toggle order details
  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Export orders
  const exportOrders = () => {
    const data = filteredAndSortedOrders.map(order => ({
      'Order ID': order.id,
      'Medicine': order.medicine_name,
      'Manufacturer': order.manufacturer_name,
      'Quantity': order.quantity,
      'Amount': formatCurrency(order.total_amount || order.amount),
      'Status': order.status,
      'Order Date': formatDate(order.created_at || order.order_date),
      'Last Updated': formatDate(order.updated_at)
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Initialize user email and fetch orders
  useEffect(() => {
    const getUserData = () => {
      try {
        let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (!userData) return null;
        const parsedData = JSON.parse(userData);
        return parsedData?.email ? parsedData.email : null;
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
      }
    };

    const email = getUserData();
    setUserEmail(email || 'Unknown User');

    // Fetch orders on mount
    fetchOrders();

    // Set up socket for real-time updates
    const socket = io("http://localhost:8080", {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Connected to order updates');
    });

    socket.on('orderUpdate', (data) => {
      console.log('📦 Order update received:', data);
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Order Management</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-40 lg:w-60"
              />
            </div>
            
            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        {/* Stats Grid - 5 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-6 mb-6">
          {/* Total Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Total Orders</h3>
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {orderStatistics.totalOrders}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              All time orders placed
            </p>
          </div>

          {/* Pending Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Pending</h3>
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {orderStatistics.pendingOrders}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              Orders awaiting manufacturer approval
            </p>
          </div>

          {/* Approved Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Approved</h3>
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {orderStatistics.approvedOrders}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              Orders accepted by manufacturer
            </p>
          </div>

          {/* Rejected Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Rejected</h3>
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {orderStatistics.rejectedOrders}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              Orders declined by manufacturer
            </p>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-400 text-lg font-bold">₹</span>
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Total Revenue</h3>
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {formatCurrency(orderStatistics.totalRevenue)}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              Revenue from all orders
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-300">
              Showing {filteredAndSortedOrders.length} of {orders.length} orders
              {filterStatus !== 'all' && ` (${filterStatus})`}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">
              Filtered Total: <span className="text-white font-semibold">{formatCurrency(totalFilteredValue)}</span>
            </div>
            
            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button
              onClick={exportOrders}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-400">Error loading orders: {error}</p>
              <button
                onClick={fetchOrders}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredAndSortedOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No orders found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchTerm ? 'Try a different search term' : 
                 filterStatus !== 'all' ? `No ${filterStatus} orders available` : 
                 'No orders have been placed yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">ORDER DETAILS</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">MEDICINE</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">MANUFACTURER</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">QUANTITY</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">AMOUNT</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">STATUS</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => {
                      const statusStyle = getStatusBadge(order.status);
                      const isExpanded = expandedOrder === order.id;
                      
                      return (
                        <React.Fragment key={order.id}>
                          {/* Main Row */}
                          <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-medium text-white">{order.id || 'N/A'}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {formatDate(order.created_at || order.order_date)}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-white">{order.medicine_name || 'N/A'}</div>
                              {order.batch_number && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Batch: {order.batch_number}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-white">{order.manufacturer_name || 'N/A'}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-white font-medium">{order.quantity || 0}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-white font-medium">
                                {formatCurrency(order.total_amount || order.amount)}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                                statusStyle.bg,
                                statusStyle.text,
                                statusStyle.border
                              )}>
                                {statusStyle.icon}
                                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleOrderDetails(order.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-gray-900/50">
                              <td colSpan="7" className="py-6 px-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Order Information */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Order Information</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Order ID:</span>
                                        <span className="text-white text-sm">{order.id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Order Date:</span>
                                        <span className="text-white text-sm">{formatDate(order.created_at || order.order_date)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Last Updated:</span>
                                        <span className="text-white text-sm">{formatDate(order.updated_at)}</span>
                                      </div>
                                      {order.payment_status && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400 text-sm">Payment Status:</span>
                                          <span className={cn(
                                            "text-sm px-2 py-0.5 rounded",
                                            order.payment_status === 'paid' 
                                              ? "bg-green-500/10 text-green-400" 
                                              : "bg-yellow-500/10 text-yellow-400"
                                          )}>
                                            {order.payment_status}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Product Details */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Product Details</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Medicine:</span>
                                        <span className="text-white text-sm">{order.medicine_name}</span>
                                      </div>
                                      {order.category && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400 text-sm">Category:</span>
                                          <span className="text-white text-sm">{order.category}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Quantity:</span>
                                        <span className="text-white text-sm">{order.quantity}</span>
                                      </div>
                                      {order.unit_price && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400 text-sm">Unit Price:</span>
                                          <span className="text-white text-sm">{formatCurrency(order.unit_price)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Total Amount:</span>
                                        <span className="text-white font-medium">{formatCurrency(order.total_amount || order.amount)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Status & Notes */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Status & Notes</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">Status:</span>
                                        <div className={cn(
                                          "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                                          statusStyle.bg,
                                          statusStyle.text,
                                          statusStyle.border
                                        )}>
                                          {statusStyle.icon}
                                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                        </div>
                                      </div>
                                      
                                      {order.rejection_reason && order.status === 'rejected' && (
                                        <div>
                                          <div className="text-gray-400 text-sm mb-1">Rejection Reason:</div>
                                          <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">
                                            {order.rejection_reason}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {order.notes && (
                                        <div>
                                          <div className="text-gray-400 text-sm mb-1">Notes:</div>
                                          <div className="text-gray-300 text-sm bg-gray-700/50 p-2 rounded-lg">
                                            {order.notes}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {(order.status === 'approved' || order.status === 'shipped') && (
                                        <button className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
                                          Track Shipment
                                        </button>
                                      )}
                                      
                                      {order.status === 'pending' && (
                                        <button className="w-full mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm">
                                          Contact Manufacturer
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4 py-3 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, filteredAndSortedOrders.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredAndSortedOrders.length}</span> results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Summary Footer */}
          {/* Summary Footer */}
{filteredAndSortedOrders.length > 0 && (
  <div className="p-4 border-t border-gray-700 bg-gray-900/50">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between text-sm text-gray-400 gap-2">
      <div>
        Showing {filteredAndSortedOrders.length} orders • 
        Total Value: <span className="text-white font-semibold ml-1">
          {formatCurrency(totalFilteredValue)}
        </span>
        • Approved Value: <span className="text-green-400 font-semibold ml-1">
          {formatCurrency(filteredAndSortedOrders.reduce((sum, order) => {
            if (order.status === 'approved') {
              const amount = parseFloat(order.total_amount || order.amount || 0);
              return sum + (isNaN(amount) ? 0 : amount);
            }
            return sum;
          }, 0))}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Approved: {orderStats.approved}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Rejected: {orderStats.rejected}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span>Pending: {orderStats.pending}</span>
        </div>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

// Main Wholesaler Orders Component
const WholesalerOrders = () => {
  return (
    <MobileMenuProvider>
      <OrdersProvider>
        <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
          <Sidebar />
          <OrderManagement />
        </div>
      </OrdersProvider>
    </MobileMenuProvider>
  );
};

export default WholesalerOrders;