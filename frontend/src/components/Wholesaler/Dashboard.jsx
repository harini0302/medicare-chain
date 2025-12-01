import React, { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Bell, Package, Truck, FileText, Mail, Ship, Zap, ShoppingCart, LogOut, Search, DollarSign, Users, ClipboardList, AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
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
// Notification Context
const NotificationContext = React.createContext();

// Notification Provider
const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = "http://localhost:8080/api";

  const getUserData = () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
      const parsedData = JSON.parse(userData);
      return parsedData;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userData = getUserData();
      if (!userData?.id) {
        console.error('❌ No user ID found for fetching notifications');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/notifications/${userData.id}`);
      if (response.data && response.data.success) {
        const notificationsWithDates = response.data.notifications.map(notification => ({
          ...notification,
          timestamp: new Date(notification.created_at || Date.now()),
          read: notification.is_read === 1
        }));
        
        setNotifications(notificationsWithDates);
        setUnreadCount(response.data.pagination?.unreadCount || 0);
        console.log('✅ Notifications loaded:', notificationsWithDates.length);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`);
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId ? { ...notification, read: true, is_read: 1 } : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userData = getUserData();
      if (!userData?.id) return;

      const response = await axios.patch(`${API_BASE_URL}/notifications/${userData.id}/read-all`);
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true, is_read: 1 }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  };

  const clearNotification = async (notificationId) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      console.log('Cleared notification:', notificationId);
    } catch (error) {
      console.error('❌ Error clearing notification:', error);
    }
  };

  // Fetch unread count separately
  const fetchUnreadCount = async () => {
    try {
      const userData = getUserData();
      if (!userData?.id) return;

      const response = await axios.get(`${API_BASE_URL}/notifications/${userData.id}/unread-count`);
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  };

  // Set up real-time notifications using polling
  useEffect(() => {
    const userData = getUserData();
    if (!userData?.id) return;

    // Fetch notifications initially
    fetchNotifications();

    // Set up polling for real-time updates (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      clearNotification,
      fetchNotifications,
      fetchUnreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
// Notification Bell Component
const NotificationBellWithModal = () => {
  const { 
    notifications, 
    unreadCount, 
    loading,
    markAsRead, 
    markAllAsRead, 
    clearNotification,
    fetchNotifications
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Add this useEffect to refresh notifications when order status updates
  useEffect(() => {
    const handleOrderStatusUpdate = () => {
      console.log('🔄 Order status updated, refreshing notifications...');
      fetchNotifications();
    };

    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    
    return () => {
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    };
  }, [fetchNotifications]);

  // 🆕 ADD THIS NEW USEEFFECT FOR REFRESH EVENTS
  useEffect(() => {
    const handleRefreshNotifications = () => {
      console.log('🔄 Refreshing notifications due to real-time update...');
      fetchNotifications();
    };

    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    
    return () => {
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
    };
  }, [fetchNotifications]); // ✅ Make sure fetchNotifications is in dependencies

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Handle different notification types based on your schema
    switch(notification.type) {
      case 'order_approved':
        // Navigate to orders page
        navigate('/wholesaler/orders');
        break;
      case 'order_rejected':
        // Navigate to orders page
        navigate('/wholesaler/orders');
        break;
      case 'order_request':
        // For wholesaler, this might be order status updates
        navigate('/wholesaler/orders');
        break;
      case 'invoice_sent':
        // Navigate to invoices or orders page
        navigate('/wholesaler/orders');
        break;
      default:
        console.log('Notification type:', notification.type);
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'order_approved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'order_rejected':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'order_request':
        return <ShoppingCart className="w-4 h-4 text-blue-400" />;
      case 'invoice_sent':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'order_approved':
        return 'border-l-green-500';
      case 'order_rejected':
        return 'border-l-red-500';
      case 'order_request':
        return 'border-l-blue-500';
      case 'invoice_sent':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getNotificationTitle = (type) => {
    switch(type) {
      case 'order_approved':
        return 'Order Approved';
      case 'order_rejected':
        return 'Order Rejected';
      case 'order_request':
        return 'Order Update';
      case 'invoice_sent':
        return 'Invoice Sent';
      default:
        return 'Notification';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const diffInMs = now - new Date(timestamp);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const getActionText = (type) => {
    switch(type) {
      case 'order_approved':
      case 'order_rejected':
      case 'order_request':
        return 'View Orders';
      case 'invoice_sent':
        return 'View Invoice';
      default:
        return 'View Details';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 relative"
        disabled={loading}
      >
        <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 lg:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No notifications</p>
                <p className="text-gray-500 text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "border-l-4 p-4 border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors",
                    getNotificationColor(notification.type),
                    !notification.read && "bg-blue-500/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-white font-medium text-sm">
                          {notification.title || getNotificationTitle(notification.type)}
                        </span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">
                          {formatTime(notification.timestamp)}
                        </span>
                        <span className="text-purple-400 text-xs font-medium">
                          {getActionText(notification.type)}
                        </span>
                      </div>
                      {notification.related_order_id && (
                        <div className="mt-2">
                          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                            Order #{notification.related_order_id}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-red-400 ml-2 flex-shrink-0 p-1 rounded hover:bg-gray-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-750">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{unreadCount} unread of {notifications.length} total</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
// Medicines Management Hook
const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const MEDICINES_API = "http://localhost:8080/api/medicines";

  const getUserData = () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
      const parsedData = JSON.parse(userData);
      return parsedData?.email ? parsedData : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  };

  // Fetch medicines from API
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const user = getUserData();
      if (!user?.email) {
        console.error("❌ No user email found");
        return;
      }

      console.log("🔍 Fetching medicines for user:", user.email);
      const response = await axios.get(`${MEDICINES_API}?user_email=${encodeURIComponent(user.email)}`);
      console.log("✅ Fetched medicines:", response.data);
      
      setMedicines(response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching medicines:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get medicines count
  const getMedicinesCount = () => medicines.length;

  // Get low stock medicines count (less than 100)
  const getLowStockCount = () => medicines.filter(med => med.stock_qty < 100).length;

  // Get total stock value
  const getTotalStockValue = () => {
    return medicines.reduce((total, med) => {
      return total + (med.unit_price * med.stock_qty);
    }, 0);
  };

  return {
    medicines,
    loading,
    fetchMedicines,
    getMedicinesCount,
    getLowStockCount,
    getTotalStockValue
  };
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
          <span className="text-xl font-semibold text-white">Wholesaler</span>
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

// Area Chart Component for Monthly Revenue
const MonthlyRevenueChart = () => {
  const revenueData = [
    { month: "Jan", revenue: 125000 },
    { month: "Feb", revenue: 145000 },
    { month: "Mar", revenue: 165000 },
    { month: "Apr", revenue: 185000 },
    { month: "May", revenue: 210000 },
    { month: "Jun", revenue: 235000 },
    { month: "Jul", revenue: 255000 },
    { month: "Aug", revenue: 280000 },
    { month: "Sep", revenue: 295000 },
    { month: "Oct", revenue: 315000 },
    { month: "Nov", revenue: 330000 },
    { month: "Dec", revenue: 350000 },
  ];

  const maxRevenue = Math.max(...revenueData.map(item => item.revenue));
  const minRevenue = Math.min(...revenueData.map(item => item.revenue));

  // Generate area chart path - FIXED to use full width
  const getAreaPath = () => {
    const points = revenueData.map((item, index) => {
      // Distribute points evenly across the full width (0% to 100%)
      const x = (index / (revenueData.length - 1)) * 100;
      // Calculate Y position (inverted since SVG Y=0 is top)
      const y = 100 - ((item.revenue - minRevenue) / (maxRevenue - minRevenue)) * 80;
      return { x, y };
    });

    if (points.length === 0) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i].y}`;
    }
    
    // Close the path for area fill - go to bottom right, then bottom left, then back to start
    path += ` L 100,100 L 0,100 Z`;
    
    return path;
  };

  // Generate line path - FIXED to use full width
  const getLinePath = () => {
    const points = revenueData.map((item, index) => {
      const x = (index / (revenueData.length - 1)) * 100;
      const y = 100 - ((item.revenue - minRevenue) / (maxRevenue - minRevenue)) * 80;
      return { x, y };
    });

    if (points.length === 0) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i].y}`;
    }
    
    return path;
  };

  return (
    <div className="h-32 lg:h-48 relative">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Area fill */}
        <path d={getAreaPath()} fill="url(#areaGradient)" />
        
        {/* Line */}
        <path 
          d={getLinePath()} 
          fill="none" 
          stroke="url(#lineGradient)" 
          strokeWidth="1.5" 
        />
        
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Month labels - simplified for mobile */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {revenueData.filter((_, index) => index % 3 === 0).map((item, index) => (
          <span key={index} className="text-gray-400 text-[10px] lg:text-xs">
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
};

// Semi-Circle Chart Component for Stock Turnover
const StockTurnoverChart = () => {
  const stockData = [
    { month: 'Jan', turnover: 3.2 },
    { month: 'Feb', turnover: 3.5 },
    { month: 'Mar', turnover: 3.8 },
    { month: 'Apr', turnover: 4.1 },
    { month: 'May', turnover: 4.3 },
    { month: 'Jun', turnover: 4.5 },
    { month: 'Jul', turnover: 4.6 },
    { month: 'Aug', turnover: 4.8 },
    { month: 'Sep', turnover: 4.7 },
    { month: 'Oct', turnover: 4.9 },
    { month: 'Nov', turnover: 5.1 },
    { month: 'Dec', turnover: 5.2 },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Semi-circle chart */}
      <div className="relative w-24 lg:w-32 h-12 lg:h-16 mb-3 lg:mb-4">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * 0.82)} // 82% progress
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white font-bold text-base lg:text-lg">5.2x</div>
            <div className="text-gray-400 text-[10px] lg:text-xs">Turnover</div>
          </div>
        </div>
      </div>

      {/* Month labels in 3 rows */}
      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-[10px] lg:text-xs">
        {stockData.slice(0, 4).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-[10px] lg:text-xs mt-1">
        {stockData.slice(4, 8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-[10px] lg:text-xs mt-1">
        {stockData.slice(8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
    </div>
  );
};

// Dashboard Content Component
const DashboardContent = () => {
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { 
    getMedicinesCount, 
    getLowStockCount, 
    getTotalStockValue,
    fetchMedicines,
    loading 
  } = useMedicines();

  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 2800000,
    activeRetailers: 247,
    pendingOrders: 45,
    medicinesCount: 0,
    lowStockCount: 0,
    totalStockValue: 0
  });

  const [userEmail, setUserEmail] = useState('');

  // Fetch medicines data when component mounts
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await fetchMedicines();
        const medicinesCount = getMedicinesCount();
        const lowStockCount = getLowStockCount();
        const totalStockValue = getTotalStockValue();
        
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
        
        setDashboardData(prev => ({
          ...prev,
          medicinesCount,
          lowStockCount,
          totalStockValue
        }));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadDashboardData();
  }, []);

  // Update dashboard data when medicine counts change
  useEffect(() => {
    const medicinesCount = getMedicinesCount();
    const lowStockCount = getLowStockCount();
    const totalStockValue = getTotalStockValue();

    setDashboardData(prev => ({
      ...prev,
      medicinesCount,
      lowStockCount,
      totalStockValue
    }));
  }, [getMedicinesCount(), getLowStockCount(), getTotalStockValue()]);

  const orderFulfillmentData = [
    { status: 'Processing', orders: 1567, percentage: 88 },
    { status: 'Shipped', orders: 1423, percentage: 75 },
    { status: 'Delivered', orders: 1289, percentage: 68 }
  ];

  const getStatusInfo = (status) => {
    switch(status.toLowerCase()) {
      case 'shipped':
        return { icon: <Truck size={16} />, color: '#10b981' };
      case 'delivered':
        return { icon: <CheckCircle size={16} />, color: '#3b82f6' };
      case 'processing':
        return { icon: <Clock size={16} />, color: '#f59e0b' };
      default:
        return { icon: <Clock size={16} />, color: '#6b7280' };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(number);
  };

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
              <h1 className="text-xl lg:text-2xl font-bold text-white">Wholesaler Dashboard</h1>
              <div className="mt-1 lg:mt-2 text-xs lg:text-sm text-gray-300">
                <span>Logged in as: </span>
                <span className="font-semibold text-blue-300">
                  {userEmail}
                </span>
                <span className="mx-1 lg:mx-2 hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  Showing {dashboardData.medicinesCount} medicines for your company
                </span>
                <span className="sm:hidden">
                  {dashboardData.medicinesCount} medicines
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search Bar - Hidden on mobile */}
            <div className="relative hidden md:block">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products, orders, retailers..."
                className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-60 lg:w-80"
              />
            </div>
            
            <NotificationBellWithModal />
            
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs lg:text-sm font-medium">W</span>
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        <div className="mt-4 md:hidden">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        {/* Stats Grid - Responsive for mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {/* Total Revenue Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Total Revenue</h3>
              </div>
              <span className="bg-green-500/10 text-green-400 text-xs font-medium px-2 py-1 rounded">+22%</span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">{formatCurrency(dashboardData.totalRevenue)}</div>
            <p className="text-gray-400 text-xs lg:text-sm">Excellent 22% growth from last quarter</p>
          </div>

          {/* Total Medicines Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Total Medicines</h3>
              </div>
              <span className="bg-purple-500/10 text-purple-400 text-xs font-medium px-2 py-1 rounded">
                {dashboardData.medicinesCount > 0 ? 'Active' : 'None'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">
              {loading ? "Loading..." : dashboardData.medicinesCount}
            </div>
            <p className="text-gray-400 text-xs lg:text-sm">
              {dashboardData.medicinesCount === 1 ? 'Medicine in inventory' : 'Medicines in inventory'}
            </p>
          </div>

          {/* Pending Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Pending Orders</h3>
              </div>
              <span className="bg-yellow-500/10 text-yellow-400 text-xs font-medium px-2 py-1 rounded">+12</span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">{dashboardData.pendingOrders}</div>
            <p className="text-gray-400 text-xs lg:text-sm">Orders awaiting processing</p>
          </div>

          {/* Low Stock Alert Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                </div>
                <h3 className="text-white text-sm lg:text-base font-medium">Low Stock Alert</h3>
              </div>
              <span className="bg-red-500/10 text-red-400 text-xs font-medium px-2 py-1 rounded">
                {dashboardData.medicinesCount > 0 
                  ? Math.round((dashboardData.lowStockCount / dashboardData.medicinesCount) * 100) + '%'
                  : '0%'
                }
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">{dashboardData.lowStockCount}</div>
            <p className="text-gray-400 text-xs lg:text-sm">Products below reorder level</p>
          </div>
        </div>

        {/* Charts Grid - Responsive for mobile */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* Order Fulfillment Rate */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold text-white">Order Fulfillment Rate</h3>
              <div className="flex items-center gap-2 text-gray-400 text-xs lg:text-sm">
                <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                <span>Dec 2024</span>
              </div>
            </div>
            <div className="space-y-3 lg:space-y-4">
              {orderFulfillmentData.map((item, index) => {
                const statusInfo = getStatusInfo(item.status);
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ color: statusInfo.color }}>
                          {statusInfo.icon}
                        </div>
                        <span className="text-white text-sm font-medium">{item.status}</span>
                      </div>
                      <span className="text-white font-semibold text-sm lg:text-base">{item.percentage}%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatCompactNumber(item.orders)} orders
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: statusInfo.color
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Revenue - Updated for mobile */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex-1">
                <h3 className="text-base lg:text-lg font-semibold text-white">Monthly Revenue</h3>
                <p className="text-gray-400 text-xs lg:text-sm mt-1">December 2024 Performance</p>
              </div>
              <div className="flex items-center gap-2 bg-green-500/10 text-green-400 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded-full">
                <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                +15% growth
              </div>
            </div>
            
            {/* Chart Container */}
            <div className="h-32 lg:h-48 mb-3 lg:mb-4">
              <MonthlyRevenueChart />
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 lg:gap-4 pt-3 lg:pt-4 border-t border-gray-700">
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Current</div>
                <div className="text-white font-semibold text-sm lg:text-base">$350K</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Average</div>
                <div className="text-white font-semibold text-sm lg:text-base">$246K</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Peak</div>
                <div className="text-green-400 font-semibold text-sm lg:text-base">Dec</div>
              </div>
            </div>
          </div>

          {/* Stock Turnover Rate */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold text-white">Stock Turnover Rate</h3>
            </div>
            
            <div className="flex justify-center mb-3 lg:mb-4">
              <StockTurnoverChart />
            </div>
            
            <div className="grid grid-cols-3 gap-2 lg:gap-4 pt-3 lg:pt-4 border-t border-gray-700">
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Avg Turnover</div>
                <div className="text-white font-semibold text-sm lg:text-base">4.3x</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Growth</div>
                <div className="text-green-400 font-semibold text-sm lg:text-base">+18.5%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Peak Month</div>
                <div className="text-white font-semibold text-sm lg:text-base">Dec - 5.2x</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



// Add this inside the WholesalerDashboard component, before the return statement
const WholesalerDashboard = () => {
  const [socket, setSocket] = useState(null);

 // In WholesalerDashboard - Update the socket listeners:
// In WholesalerDashboard - Replace the entire socket useEffect with this:

useEffect(() => {
  const newSocket = io("http://localhost:8080", {
    transports: ['websocket', 'polling']
  });
  
  setSocket(newSocket);

  const getUserDataInsideEffect = () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  };

  newSocket.on('connect', () => {
    console.log('✅ Wholesaler connected to server');
    
    const userData = getUserDataInsideEffect();
    if (userData?.id) {
      newSocket.emit('join-wholesaler', userData.id);
      console.log(`🏪 Joined wholesaler room: ${userData.id}`);
    }
  });

  // 🆕 PROPERLY HANDLE ORDER UPDATE EVENTS
  newSocket.on("orderUpdate", (data) => {
    console.log("📦 ORDER UPDATE RECEIVED FROM MANUFACTURER:", {
      orderId: data.orderId,
      status: data.status,
      wholesalerId: data.wholesalerId,
      manufacturerId: data.manufacturerId,
      timestamp: data.timestamp
    });
    
    // Determine notification type based on status
    const isApproved = data.status === 'approved' || data.status === 'accepted';
    const notificationType = isApproved ? 'order_approved' : 'order_rejected';
    const notificationTitle = isApproved ? 'Order Approved!' : 'Order Rejected';
    const notificationMessage = isApproved 
      ? `Your order #${data.orderId} has been approved by the manufacturer`
      : `Your order #${data.orderId} was rejected. Reason: ${data.rejectionReason || 'No reason provided'}`;

    console.log('🎉 Creating notification:', {
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage
    });
    
    // Show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notificationTitle, {
        body: notificationMessage,
        icon: logo
      });
    }
    
    // Trigger UI updates
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
      detail: { 
        orderId: data.orderId, 
        status: data.status,
        message: notificationMessage
      } 
    }));

    // Refresh notifications
    window.dispatchEvent(new Event('refreshNotifications'));
    
    console.log('✅ UI update events triggered');
  });

  // Also listen for orderStatusUpdate events
  newSocket.on("orderStatusUpdate", (data) => {
    console.log("🔔 Order status update received:", data);
    // Handle orderStatusUpdate events if needed
  });

  // Listen for test responses
  newSocket.on("testResponse", (data) => {
    console.log("🧪 Test response from server:", data);
  });

  return () => {
    console.log('🔌 Disconnecting wholesaler socket...');
    newSocket.disconnect();
  };
}, []);

// Update the testSocketConnection function:
const testSocketConnection = () => {
  if (socket) {
    console.log('🔍 Testing socket connection...');
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    
    // Test sending a message to server
    socket.emit('test', { 
      message: 'Test from wholesaler dashboard',
      timestamp: new Date().toISOString(),
      userId: getUserData()?.id 
    });
    console.log('✅ Test message sent to server');
    
    // Test receiving by simulating an order update
    console.log('🧪 Simulating incoming order update for UI testing...');
    const testData = {
      orderId: 'TEST_' + Date.now(),
      status: 'approved',
      message: 'This is a test order approval from manufacturer',
      timestamp: new Date().toISOString(),
      manufacturerId: 25
    };
    
    // Simulate receiving an order update (tests UI without needing manufacturer)
    setTimeout(() => {
      // Directly trigger the socket event handler for testing
      if (socket) {
        socket.emit('orderUpdate', testData);
      }
      
      // Also trigger UI updates directly
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
        detail: { orderId: testData.orderId, status: testData.status } 
      }));
      window.dispatchEvent(new Event('refreshNotifications'));
      console.log('✅ Test events triggered - check notifications bell!');
    }, 1000);
    
  } else {
    console.warn('❌ Socket not connected - cannot test');
    console.log('Socket state:', socket);
  }
};// Add this helper function inside WholesalerDashboard component
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

  return (
    <MobileMenuProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
          <Sidebar />
           
        {/* 🆕 TEMPORARY DEBUG PANEL - Remove after testing */}
        <div className="fixed bottom-4 left-4 z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 max-w-xs">
          <div className="text-white text-sm font-medium mb-2">Socket Debug</div>
          <div className="text-xs space-y-1">
            <div className="text-green-400">Connected: {socket?.connected ? 'Yes' : 'No'}</div>
            <div className="text-blue-400">ID: {socket?.id || 'None'}</div>
            <button 
              onClick={testSocketConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs mt-2"
            >
              Test
            </button>
          </div>
        </div>
        
        {/* 🆕 TEMPORARY TEST BUTTON - You can remove this later */}
        <div className="fixed bottom-4 right-4 z-50">
          <button 
            onClick={testSocketConnection}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Test Socket
          </button>
        </div>
          <DashboardContent />
        </div>
      </NotificationProvider>
    </MobileMenuProvider>
  );
};
export default WholesalerDashboard;