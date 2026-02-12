import React, { useState, useEffect, useMemo, useCallback  } from "react";
import { LayoutDashboard, ChevronDown, LogOut,   Bell, Package, Truck, FileText, Mail, Ship, Zap, ShoppingCart,  Search, DollarSign, Users, ClipboardList, AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import axios from 'axios';
import { io } from "socket.io-client";

const API_BASE_URL = "http://localhost:8080/api";

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Mobile Menu Context
const MobileMenuContext = React.createContext();

// Simple cn utility function
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

// Notification Context
const NotificationContext = React.createContext();

// In NotificationProvider component
const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

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

  // Initialize socket connection
  useEffect(() => {
    const userData = getUserData();
    if (!userData?.id) return;

    const newSocket = io("http://localhost:8080", {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Notification Provider: Connected to socket server');
      newSocket.emit('join-wholesaler', userData.id);
    });

    // ========== 🆕 HANDLE INVOICE NOTIFICATIONS ==========
    newSocket.on("invoiceUpdate", (data) => {
      console.log("📄 NotificationProvider: Invoice update received:", data);
      
      // Check if this notification is for this wholesaler
      const currentUser = getUserData();
      const isForThisWholesaler = currentUser?.id && data.targetWholesalerId && 
                                   data.targetWholesalerId == currentUser.id;
      
      if (!isForThisWholesaler) {
        console.log('⚠️ Invoice update not for this wholesaler');
        return;
      }

      // Create invoice notification
      const notificationData = {
        type: 'invoice_approved',
        title: data.title || 'Invoice Approved ✅',
        message: data.message || `Invoice #${data.invoiceNumber} has been approved`,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString()
      };

      // Add to notifications
      addRealTimeNotification(notificationData);
      
      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification('Invoice Approved ✅', {
          body: `Invoice #${data.invoiceNumber} has been approved. Amount: ₹${data.amount || '0.00'}`,
          tag: `invoice-${data.invoiceId}`
        });
      }
    });

    // ========== 🆕 HANDLE NEW INVOICE ==========
    newSocket.on("newInvoice", (data) => {
      console.log("📄 NotificationProvider: New invoice created:", data);
      
      const currentUser = getUserData();
      if (data.wholesalerId && data.wholesalerId != currentUser?.id) {
        console.log('⚠️ New invoice not for this wholesaler');
        return;
      }

      const notificationData = {
        type: 'invoice_created',
        title: 'New Invoice Created',
        message: `Invoice #${data.invoiceNumber} has been created. Amount: ₹${data.totalAmount}`,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        amount: data.totalAmount,
        timestamp: data.timestamp || new Date().toISOString()
      };

      addRealTimeNotification(notificationData);
    });

    // ========== 🆕 HANDLE INVOICE NOTIFICATION ==========
    newSocket.on("invoiceNotification", (data) => {
      console.log("📢 NotificationProvider: Invoice notification:", data);
      
      addRealTimeNotification({
        type: data.type || 'info',
        title: data.title || 'Invoice Update',
        message: data.message || 'Your invoice has been updated',
        invoiceId: data.invoiceId,
        timestamp: data.timestamp,
        isRead: false
      });
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

   const addRealTimeNotification = useCallback((notificationData) => {
    console.log('🎯 Adding real-time notification:', notificationData);
    
    // Create a unique ID based on orderId and status
    const notificationId = `rt_${notificationData.orderId}_${notificationData.status}`;
    
    const newNotification = {
      id: notificationId,
      type: notificationData.status === 'approved' ? 'order_approved' : 'order_rejected',
      title: notificationData.status === 'approved' ? 'Order Approved!' : 'Order Rejected',
      message: notificationData.message || 
        (notificationData.status === 'approved' 
          ? `Your order #${notificationData.orderId} has been approved by the manufacturer` 
          : `Your order #${notificationData.orderId} was rejected${notificationData.rejectionReason ? ': ' + notificationData.rejectionReason : ''}`),
      timestamp: new Date(notificationData.timestamp || Date.now()),
      read: false,
      related_order_id: notificationData.orderId,
      is_real_time: true
    };

    setNotifications(prev => {
      // Remove any existing notifications for the same order
      const filteredPrev = prev.filter(n => 
        !(n.related_order_id === notificationData.orderId && 
          (n.type === 'order_approved' || n.type === 'order_rejected'))
      );
      
      // Add the new notification
      return [newNotification, ...filteredPrev];
    });
    
    setUnreadCount(prev => prev + 1);
    
    console.log('✅ Real-time notification added:', newNotification);
  }, []);

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
        
        // Process notifications to remove duplicates
        const uniqueNotifications = processNotifications(notificationsWithDates);
        
        // Store ALL notifications
        setAllNotifications(uniqueNotifications);
        
        // Only show UNREAD notifications
        const unreadNotifications = uniqueNotifications.filter(n => !n.read);
        setNotifications(unreadNotifications);
        
        setUnreadCount(response.data.pagination?.unreadCount || 0);
        console.log('✅ Notifications loaded:', uniqueNotifications.length, 'Total |', unreadNotifications.length, 'Unread');
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      // First mark as read in database
      await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`);
      
      // Update both lists
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, is_read: 1 } : n)
      );
      
      // Remove from visible notifications (unread list)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ Notification dismissed and marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
    }
  };

  // Helper function to process notifications and remove duplicates
  const processNotifications = (notifications) => {
    const orderStatusMap = new Map();
    const result = [];
    
    // Process in reverse order to get the latest status first
    notifications.reverse().forEach(notification => {
      const orderId = notification.related_order_id;
      const type = notification.type;
      
      // Only process order approval/rejection notifications
      if (type === 'order_approved' || type === 'order_rejected' || type === 'order_request') {
        if (!orderStatusMap.has(orderId)) {
          // First time seeing this order, add it
          orderStatusMap.set(orderId, type);
          result.push(notification);
        } else if (orderStatusMap.get(orderId) !== type) {
          // Status changed (e.g., pending → approved), update
          orderStatusMap.set(orderId, type);
          // Remove previous status notification for this order
          const index = result.findIndex(n => n.related_order_id === orderId);
          if (index > -1) {
            result.splice(index, 1);
          }
          result.push(notification);
        }
        // If same status, skip duplicate
      } else {
        // For non-order notifications, always add
        result.push(notification);
      }
    });
    
    return result.reverse(); // Return in original order
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
      dismissNotification, 
      fetchNotifications,
      fetchUnreadCount,
      addRealTimeNotification
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
     dismissNotification,
    fetchNotifications,
    addRealTimeNotification
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
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

  // ADD THIS NEW USEEFFECT FOR REFRESH EVENTS
  useEffect(() => {
    const handleRefreshNotifications = () => {
      console.log('🔄 Refreshing notifications due to real-time update...');
      fetchNotifications();
    };

    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    
    return () => {
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
    };
  }, [fetchNotifications]);

  // FIXED: Handle real-time notifications
  useEffect(() => {
    const handleRealTimeNotification = (event) => {
      console.log('🎯 Received real-time notification event:', event.detail);
      if (addRealTimeNotification) {
        addRealTimeNotification(event.detail);
      }
    };

    window.addEventListener('addRealTimeNotification', handleRealTimeNotification);
    
    return () => {
      window.removeEventListener('addRealTimeNotification', handleRealTimeNotification);
    };
  }, [addRealTimeNotification]);

  const handleNotificationClick = (notification) => {
    // Mark as read first
    markAsRead(notification.id);
    
    // Handle different notification types based on your schema
    switch(notification.type) {
      case 'order_approved':
      case 'order_rejected':
      case 'order_request':
      case 'invoice_sent':
        // Navigate to orders page for all order-related notifications
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
      case 'invoice_approved':
      case 'invoice_created':
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
      case 'invoice_approved':
      case 'invoice_created':
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
      case 'invoice_approved':
        return 'Invoice Approved';
      case 'invoice_created': 
        return 'Invoice Created';
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
      case 'invoice_sent':
        return 'View Orders';
      default:
        return 'View Details';
    }
  };

  // Add function to toggle expansion
  const toggleExpansion = (notificationId, e) => {
    e.stopPropagation();
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // In your notification display, group by order ID
  const groupedNotifications = useMemo(() => {
    const groups = {};
    notifications.forEach(notification => {
      if (notification.related_order_id) {
        const orderId = notification.related_order_id;
        if (!groups[orderId]) {
          groups[orderId] = [];
        }
        groups[orderId].push(notification);
      }
    });
    return groups;
  }, [notifications]);

  const totalNotifications = notifications.length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 relative"
        disabled={loading}
      >
        <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
        {totalNotifications > 0 && (
          <span 
            className={cn(
              "absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center font-medium shadow-lg",
              totalNotifications > 99 ? "px-1.5 py-0.5 min-w-[1.75rem] text-[10px]" : 
              totalNotifications > 9 ? "w-5 h-5 lg:w-6 lg:h-6 text-xs" : 
              "w-4 h-4 lg:w-5 lg:h-5 text-xs"
            )}
          >
            {totalNotifications > 99 ? '99+' : totalNotifications}
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
              <>
                {/* Display grouped notifications for orders */}
                {Object.keys(groupedNotifications).length > 0 && (
                  <>
                    {Object.entries(groupedNotifications).map(([orderId, orderNotifications]) => {
                      // Sort by timestamp (newest first)
                      const sortedNotifications = orderNotifications.sort((a, b) => 
                        new Date(b.timestamp) - new Date(a.timestamp)
                      );
                      
                      const latestNotification = sortedNotifications[0];
                      const hasMultipleStatuses = sortedNotifications.length > 1;
                      const isExpanded = expandedNotifications.has(orderId);
                      
                      return (
                        <div 
                          key={orderId} 
                          className={cn(
                            "border-l-4 p-4 border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors",
                            getNotificationColor(latestNotification.type),
                            !latestNotification.read && "bg-blue-500/5"
                          )}
                          onClick={() => handleNotificationClick(latestNotification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(latestNotification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <span className="text-white font-medium text-sm">
                                  {latestNotification.title || getNotificationTitle(latestNotification.type)}
                                </span>
                                {!latestNotification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm mb-2">
                                {latestNotification.message}
                              </p>
                              
                              {/* Show status history if there are multiple statuses */}
                              {hasMultipleStatuses && (
                                <div className="mb-2">
                                  <button 
                                    onClick={(e) => toggleExpansion(orderId, e)}
                                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                  >
                                    {isExpanded ? 'Hide' : 'Show'} status history
                                    <svg 
                                      className={`w-3 h-3 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {isExpanded && (
                                    <div className="mt-2 space-y-1">
                                      {sortedNotifications.slice(1).map((history, idx) => (
                                        <div key={idx} className="text-xs text-gray-400 pl-2 border-l border-gray-600">
                                          <div className="flex items-center gap-1">
                                            {getNotificationIcon(history.type)}
                                            <span>{history.title}:</span>
                                          </div>
                                          <div className="text-gray-500">{formatTime(history.timestamp)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs">
                                  {formatTime(latestNotification.timestamp)}
                                </span>
                                <span className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors">
                                  {getActionText(latestNotification.type)}
                                </span>
                              </div>
                              
                              <div className="mt-2">
                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                                  Order #{orderId}
                                </span>
                                {hasMultipleStatuses && (
                                  <span className="ml-2 bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded">
                                    {sortedNotifications.length} updates
                                  </span>
                                )}
                              </div>
                            </div>
 <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Dismiss all notifications for this order
                                orderNotifications.forEach(n => {
                                  dismissNotification(n.id);
                                });
                              }}
                              className="text-gray-400 hover:text-red-400 ml-2 flex-shrink-0 p-1 rounded hover:bg-gray-700 transition-colors"
                              title="Dismiss all notifications for this order"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {/* Display non-grouped notifications */}
                {notifications
                  .filter(notification => !notification.related_order_id)
                  .map((notification) => (
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
                            <span className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors">
                              {getActionText(notification.type)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-400 ml-2 flex-shrink-0 p-1 rounded hover:bg-gray-700 transition-colors"
                          title="Dismiss notification"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                }
              </>
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
/// Add this after the useMedicines hook
const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Add this line

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
      console.error("❌ No user ID in storage");
      return;
    }

    console.log("🔍 Fetching orders for wholesaler ID:", user.id);
    
    const response = await axios.get(`http://localhost:8080/api/orders/wholesaler/${user.id}`);
    console.log("✅ API Response received");
    
    let ordersData = [];
    
    // Handle different response structures
    if (response.data && response.data.success && response.data.orders) {
      ordersData = response.data.orders;
      console.log(`✅ Got ${ordersData.length} orders from /orders/wholesaler endpoint`);
    } else if (response.data && Array.isArray(response.data)) {
      ordersData = response.data;
      console.log(`✅ Got ${ordersData.length} orders as direct array`);
    } else {
      console.error('❌ Unexpected response structure:', response.data);
      setError("Invalid response format from server");
      return;
    }
    
    // DEBUG: Check actual field names in first order
    if (ordersData.length > 0) {
      console.log("🔍 Actual fields in first order:", Object.keys(ordersData[0]));
      console.log("🔍 First order medicine_name field:", ordersData[0].medicine_name);
      console.log("🔍 First order manufacturer_name field:", ordersData[0].manufacturer_name);
    }
    
    // Process orders for display
    const processedOrders = ordersData.map(order => {
      // Use the CORRECT field names from your logs
      const orderId = order.order_id || order.id || 'N/A';
      const medicineName = order.medicine_name || ''; // CORRECT: snake_case
      const manufacturerName = order.manufacturer_name || ''; // CORRECT: snake_case
      const quantity = parseInt(order.quantity || 0);
      const status = (order.status || 'pending').toLowerCase();
      const totalAmount = parseFloat(order.total_amount || order.amount || 0);
      const createdAt = order.order_date || order.created_at || new Date().toISOString();
      const unitPrice = parseFloat(order.unit_price || 0);
           
      return {
        id: orderId,
        order_id: orderId,
        medicine_name: medicineName || 'Product not specified',
        manufacturer_name: manufacturerName || 'Manufacturer not specified',
        quantity: quantity,
        amount: totalAmount,
        total_amount: totalAmount,
        status: status,
        created_at: createdAt,
        updated_at: order.updated_at || createdAt,
        payment_status: order.payment_status || order.payment_mode || 'pending',
        rejection_reason: order.rejection_reason || null,
        notes: order.notes || '',
        batch_number: order.batch_number || '',
        category: order.category || 'general',
        unit_price: unitPrice,
        formatted_date: createdAt ? 
          new Date(createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Date not available',
        formatted_amount: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(totalAmount),
        _original: order // Keep for debugging
      };
    });
    
    console.log(`✅ Processed ${processedOrders.length} orders for display`);
    
    // Update this check to be more accurate
    const trulyEmptyOrders = processedOrders.filter(order => 
      order.medicine_name === 'Product not specified' || 
      order.manufacturer_name === 'Manufacturer not specified'
    );
    
    if (trulyEmptyOrders.length > 0) {
      console.log(`ℹ️ ${trulyEmptyOrders.length} orders have missing information`);
    } else {
      console.log(`🎉 All ${processedOrders.length} orders have proper data!`);
    }
    
    setOrders(processedOrders);
    
    return processedOrders;
    
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    
    if (error.response) {
      console.error("Response error:", {
        status: error.response.status,
        data: error.response.data
      });
      
      if (error.response.status === 404) {
        setError("Orders endpoint not found. Please check server configuration.");
      } else if (error.response.status === 500) {
        setError("Server error. Please try again later.");
      }
    } else if (error.request) {
      console.error("No response received. Server might be down.");
      setError("Cannot connect to server. Please check if server is running.");
    } else {
      console.error("Request error:", error.message);
      setError("Failed to fetch orders: " + error.message);
    }
    
    throw error;
  } finally {
    setLoading(false);
  }
};
  const updateOrderStatus = async (orderId, status, rejectionReason = null) => {
    try {
      const user = getUserData();
      if (!user?.id) return;

      const payload = {
        status: status,
        wholesaler_id: user.id,
        ...(rejectionReason && { rejection_reason: rejectionReason })
      };

      console.log(`🔄 Updating order ${orderId} to ${status}`, payload);
      const response = await axios.patch(
        `http://localhost:8080/api/orders/${orderId}/status`,
        payload
      );

      if (response.data.success) {
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: status,
                  updated_at: new Date().toISOString(),
                  ...(rejectionReason && { rejection_reason: rejectionReason })
                } 
              : order
          )
        );
        
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: { orderId, status, rejectionReason }
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Error updating order status:", error);
      throw error;
    }
  };
const getOrderStats = () => {
  const stats = {
    total: orders.length,
    pending: orders.filter(order => order.status === 'pending').length,
    approved: orders.filter(order => order.status === 'approved').length,
    rejected: orders.filter(order => order.status === 'rejected').length,
    processing: orders.filter(order => order.status === 'processing').length,
    shipped: orders.filter(order => order.status === 'shipped').length,
    delivered: orders.filter(order => order.status === 'delivered').length,
    totalRevenue: orders.reduce((total, order) => {
      const amount = parseFloat(order.total_amount || order.amount || 0);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0),
    // Add approved revenue only
    approvedRevenue: orders.reduce((total, order) => {
      if (order.status === 'approved') {
        const amount = parseFloat(order.total_amount || order.amount || 0);
        return total + (isNaN(amount) ? 0 : amount);
      }
      return total;
    }, 0)
  };
  return stats;
};
  return {
    orders,
    loading,
    error, // Include error in the return
    fetchOrders,
    updateOrderStatus,
    getOrderStats
  };
};

// Create an OrdersContext
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
   { icon: FileText, label: "Invoices", id: "invoices" },
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
      case 'invoices': 
        navigate('/wholesaler/invoices');
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
 const handleLogout = () => {
  console.log("Logging out...");
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('userData');
  window.location.href = '/';
};
// Simple WholesalerProfileButton
const SimpleWholesalerProfileButton = () => {
  const [userData, setUserData] = useState({ name: '', email: '' });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = () => {
      try {
        const storedData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setUserData({
            name: parsedData.fullName || parsedData.name || parsedData.email?.split('@')[0] || 'Wholesaler',
            email: parsedData.email || ''
          });
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  const getDisplayName = () => {
    if (userData.name && userData.name.trim() !== '') {
      return userData.name.length > 15 
        ? userData.name.substring(0, 12) + '...' 
        : userData.name;
    } else if (userData.email) {
      return userData.email.split('@')[0];
    }
    return 'Wholesaler';
  };

  const getInitial = () => {
    if (userData.name && userData.name.trim() !== '') {
      return userData.name.charAt(0).toUpperCase();
    } else if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    return 'W';
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm shadow-lg">
          {getInitial()}
        </div>
        
        <div className="hidden md:block">
          <div className="text-white text-sm font-medium text-left max-w-[120px] truncate">
            {getDisplayName()}
          </div>
          <div className="text-gray-400 text-xs text-left truncate max-w-[120px]">
            Wholesaler
          </div>
        </div>
        
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-60 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                {getInitial()}
              </div>
              <div>
                <p className="text-white font-medium">{getDisplayName()}</p>
                <p className="text-gray-400 text-xs">{userData.email}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                sessionStorage.removeItem('userToken');
                window.location.href = '/';
              }}
              className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
// Add a loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="ml-3 text-gray-400">Loading dashboard data...</span>
  </div>
);<button
  onClick={() => {
    fetchMedicines();
    fetchOrders();
  }}
  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
  Refresh Data
</button>
const DashboardContent = () => {
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { 
    medicines, 
    getMedicinesCount, 
    getLowStockCount, 
    getTotalStockValue,
    fetchMedicines,
    loading: medicinesLoading 
  } = useMedicines();
  
  // Get order context
  let orderContext;
  try {
    orderContext = useOrderContext();
    console.log("✅ Order context loaded successfully");
  } catch (error) {
    console.warn("⚠️ Order context not available:", error.message);
    orderContext = {
      orders: [],
      getOrderStats: () => ({ 
        total: 0, 
        pending: 0, 
        approved: 0, 
        rejected: 0,
        totalRevenue: 0 
      }),
      fetchOrders: () => Promise.resolve()
    };
  }
  
  const { getOrderStats, fetchOrders, loading: ordersLoading, orders: allOrders } = orderContext;
  
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0
  });
  
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    activeRetailers: 247,
    pendingOrders: 0,
    medicinesCount: 0,
    lowStockCount: 0,
    totalStockValue: 0
  });

  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format compact numbers
  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(number);
  };

  // Get status info for order fulfillment
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

  // Order fulfillment data (static for now)
  const orderFulfillmentData = [
    { status: 'Processing', orders: 1567, percentage: 88 },
    { status: 'Shipped', orders: 1423, percentage: 75 },
    { status: 'Delivered', orders: 1289, percentage: 68 }
  ];

  // Debug function to check data
  const debugData = () => {
    console.log("=== DEBUG DASHBOARD DATA ===");
    console.log("1. Medicines data:", {
      count: medicines?.length || 0,
      medicinesList: medicines?.slice(0, 3) || [],
      medicinesLoading
    });
    
    console.log("2. Orders data:", {
      count: allOrders?.length || 0,
      ordersList: allOrders?.slice(0, 3) || [],
      ordersLoading
    });
    
    console.log("3. Order Stats from getOrderStats():", getOrderStats());
    
    console.log("4. Current dashboardData:", dashboardData);
    console.log("5. Current orderStats:", orderStats);
    
    // Store debug info in state
    setDebugInfo({
      medicinesCount: medicines?.length || 0,
      ordersCount: allOrders?.length || 0,
      orderStats: getOrderStats(),
      userEmail: userEmail || 'Not set'
    });
  };
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoadError, setDataLoadError] = useState(null);

  // Load all dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      console.log("🔄 Starting to load dashboard data...");
      setLoading(true);
      setDataLoaded(false);
      setDataLoadError(null);
      
      try {
        // Fetch medicines data
        console.log("📦 Fetching medicines...");
        const medicinesData = await fetchMedicines();
        console.log("✅ Medicines fetched:", medicinesData?.length || 0);
        
        // Fetch orders data
        console.log("📋 Fetching orders...");
        const ordersData = await fetchOrders();
        console.log("✅ Orders fetched:", ordersData?.length || 0);
        
        // Update order stats
        console.log("📊 Calculating order stats...");
        const stats = getOrderStats();
        console.log("✅ Order stats calculated:", stats);
        setOrderStats(stats);
        
        // Get user email
        const getUserData = () => {
          try {
            let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            console.log("🔍 User data from storage:", userData);
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
        console.log("👤 User email set:", email);
        
        // Calculate medicines stats
        const medicinesCount = getMedicinesCount();
        const lowStockCount = getLowStockCount();
        const totalStockValue = getTotalStockValue();
        
        console.log("💊 Medicines stats:", {
          medicinesCount,
          lowStockCount,
          totalStockValue
        });
        
        // Update dashboard data
        const newDashboardData = {
          totalRevenue: stats.totalRevenue || 0,
          activeRetailers: 247,
          pendingOrders: stats.pending || 0,
          medicinesCount,
          lowStockCount,
          totalStockValue
        };
        
        console.log("📈 Setting dashboard data:", newDashboardData);
        setDashboardData(newDashboardData);
        
        // Mark data as loaded
        setDataLoaded(true);
        
        // Run debug
        debugData();
        
      } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        setDataLoadError(error.message);
        alert(`Error loading dashboard: ${error.message}`);
      } finally {
        setLoading(false);
        console.log("🏁 Dashboard loading complete");
      }
    };

    loadDashboardData();
    // Listen for order updates
    const handleOrderUpdated = () => {
      console.log('🔄 Order updated event received, refreshing stats...');
      try {
        const stats = getOrderStats ? getOrderStats() : orderStats;
        console.log('📊 New stats after update:', stats);
        setOrderStats(stats);
        setDashboardData(prev => ({
          ...prev,
          pendingOrders: stats.pending || 0,
          totalRevenue: stats.totalRevenue || 0
        }));
      } catch (error) {
        console.warn("Could not update order stats:", error.message);
      }
    };
    
    window.addEventListener('orderUpdated', handleOrderUpdated);
    window.addEventListener('refreshOrderList', handleOrderUpdated);
    
    return () => {
      window.removeEventListener('orderUpdated', handleOrderUpdated);
      window.removeEventListener('refreshOrderList', handleOrderUpdated);
    };
  }, []);
  useEffect(() => {
    if (!medicinesLoading && dataLoaded) {
      console.log("💊 Medicines updated, recalculating stats...");
      const medicinesCount = getMedicinesCount();
      const lowStockCount = getLowStockCount();
      const totalStockValue = getTotalStockValue();

      setDashboardData(prev => ({
        ...prev,
        medicinesCount,
        lowStockCount,
        totalStockValue
      }));
    }
  }, [medicines, medicinesLoading, dataLoaded]);

  // Update dashboard when orders change
  useEffect(() => {
    if (allOrders && allOrders.length > 0 && dataLoaded) {
      console.log("📋 Orders updated, recalculating stats...");
      const stats = getOrderStats();
      setOrderStats(stats);
      setDashboardData(prev => ({
        ...prev,
        totalRevenue: stats.totalRevenue || 0,
        pendingOrders: stats.pending || 0
      }));
    }
  }, [allOrders, dataLoaded]);
 // Show loading spinner
  if (loading || !dataLoaded) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg mb-2">Loading Dashboard</p>
          <p className="text-gray-500 text-sm">
            {medicinesLoading ? "Fetching medicines..." : 
             ordersLoading ? "Fetching orders..." : 
             "Processing data..."}
          </p>
        </div>
      </div>
    );
  }

  // Show error if data loading failed
  if (dataLoadError) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-white text-xl mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-400 mb-4">{dataLoadError}</p>
          <button
            onClick={() => {
              setDataLoaded(false);
              setLoading(true);
              fetchMedicines();
              fetchOrders();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry Loading Data
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
      {/* Header */}
      // In your WholesalerDashboardContent component's header section
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
      </div>
    </div>
    
    <div className="flex items-center gap-2 lg:gap-4">
      {/* Search Bar */}
      <div className="relative hidden md:block">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search products, orders, retailers..."
          className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-60 lg:w-80"
        />
      </div>
      
      {/* Notification Bell */}
      <NotificationBellWithModal />
      
      {/* Wholesaler Profile Dropdown */}
      <SimpleWholesalerProfileButton
        onLogout={() => {
          console.log("Logging out...");
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          sessionStorage.removeItem('userToken');
          sessionStorage.removeItem('userData');
          window.location.href = '/';
        }}
      />
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
      {/* Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
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
  {formatCurrency(orderStats.approvedRevenue)} {/* Use approvedRevenue */}
</div>
  <p className="text-gray-400 text-xs lg:text-sm">
    Revenue from approved orders only
  </p>
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
      <span className={`text-xs font-medium px-2 py-1 rounded ${
        medicines.length > 0 
          ? "bg-purple-500/10 text-purple-400" 
          : "bg-gray-500/10 text-gray-400"
      }`}>
        {medicines.length > 0 ? `${medicines.length} items` : 'None'}
      </span>
    </div>
    <div className="text-xl lg:text-2xl font-bold text-white mb-1">
      {medicines.length}
    </div>
    <p className="text-gray-400 text-xs lg:text-sm">
      {medicines.length === 1 
        ? 'Medicine in inventory' 
        : 'Medicines in inventory'}
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
      <span className={`text-xs font-medium px-2 py-1 rounded ${
        orderStats.pending > 0 
          ? "bg-yellow-500/10 text-yellow-400" 
          : "bg-gray-500/10 text-gray-400"
      }`}>
        {orderStats.pending > 0 ? `${orderStats.pending} pending` : '0'}
      </span>
    </div>
    <div className="text-xl lg:text-2xl font-bold text-white mb-1">
      {orderStats.pending}
    </div>
    <p className="text-gray-400 text-xs lg:text-sm">
      {orderStats.pending > 0 
        ? 'Orders awaiting manufacturer approval' 
        : 'All orders processed'}
    </p>
  </div>

  {/* Low Stock Medicines Card */}
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-3 lg:mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
        </div>
        <h3 className="text-white text-sm lg:text-base font-medium">Low Stock Medicines</h3>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded ${
        getLowStockCount() > 0 
          ? "bg-red-500/10 text-red-400" 
          : "bg-green-500/10 text-green-400"
      }`}>
        {getLowStockCount() > 0 ? `${getLowStockCount()} items` : 'All Good'}
      </span>
    </div>
    <div className="text-xl lg:text-2xl font-bold text-white mb-1">
      {getLowStockCount()}
    </div>
    <p className="text-gray-400 text-xs lg:text-sm">
      Medicines with less than 100 units in stock
    </p>

  </div>
</div>        
        {/* Charts Grid */}
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

          {/* Monthly Revenue */}
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

const WholesalerDashboardContent = () => {
  const [socket, setSocket] = useState(null);
  const { fetchOrders, updateOrderStatus } = useOrderContext(); // Get order functions

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      <Sidebar />       
      <DashboardContent />
    </div>
  );
};
// WholesalerDashboard component - UPDATED
const WholesalerDashboard = () => {
  return (
    <MobileMenuProvider>
      <NotificationProvider>
        <OrdersProvider>
          <WholesalerDashboardContent />
        </OrdersProvider>
      </NotificationProvider>
    </MobileMenuProvider>
  );
};
export default WholesalerDashboard;