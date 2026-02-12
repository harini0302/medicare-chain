import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Bell, Package, Truck, FileText, Mail, Ship, Zap, ShoppingCart, LogOut, Search, DollarSign, Users, ClipboardList, AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import axios from 'axios';
import { io } from "socket.io-client";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = "http://localhost:8080/api"; 
const SOCKET_URL = "http://localhost:8080"; 
const NotificationContext = React.createContext();

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

// ✅ FIXED: Define NotificationProvider first
const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => {
   try {
      const cached = localStorage.getItem('notification_unread_count');
      return cached ? parseInt(cached) : 0;
    } catch {
      return 0;
    }
  });
    const [isLoading, setIsLoading] = useState(true);

  // Get user data function
  const getUserData = useCallback(() => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
        const parsedData = JSON.parse(userData);
        console.log('👤 Parsed user data:', parsedData); 
        return parsedData;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }, []);

  // ✅ ADD: Helper function to extract order ID from notification message
  const extractOrderIdFromMessage = (message) => {
    if (!message) return null;
    
    // Try to find order ID pattern like #ORD-1764318869129-913
    const orderIdMatch = message.match(/#(ORD-\d+-\d+)/);
    if (orderIdMatch && orderIdMatch[1]) {
      console.log('🔍 Extracted order ID from message:', orderIdMatch[1]);
      return orderIdMatch[1];
    }
    
    // Try to find order ID pattern like #14 (numeric)
    const numericMatch = message.match(/#(\d+)/);
    if (numericMatch && numericMatch[1]) {
      console.log('🔍 Extracted numeric order ID from message:', numericMatch[1]);
      return numericMatch[1];
    }
    
    return null;
  };

  // ✅ ADD: Create notification function
  const addNotification = useCallback((notificationData) => {
    setNotifications(prev => {
      const newNotification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...notificationData,
        timestamp: notificationData.timestamp || new Date(),
        read: false
      };
      console.log('📝 Adding new notification:', newNotification);
      return [newNotification, ...prev];
    });
    setUnreadCount(prev => prev + 1);
  }, []);
const fetchNotifications = useCallback(async () => {
  try {
    setIsLoading(true);
    const userData = getUserData();
    if (!userData?.id) {
      console.error('❌ No user ID found for fetching notifications');
      setIsLoading(false);
      return;
    }

    console.log('🔔 Fetching notifications for manufacturer:', userData.id);
const response = await axios.get(`${API_BASE_URL}/notifications/${userData.id}`, {
  params: {
    user_role: userData.role, 
    unread_only: 'true', 
    type: userData.role === 'manufacturer' ? 'new_order,order_request' : 'order_approved,order_rejected'
  }
});
    
    if (response.data && response.data.success) {
      console.log('📋 Raw notifications from backend:', response.data.notifications);
      
      const notificationsWithDates = response.data.notifications
        .filter(notification => {
          // Only show notifications for manufacturer (new orders, order requests)
          const isManufacturerNotification = 
            notification.type === 'new_order' || 
            notification.type === 'order_request';
          
          // Also filter out notifications that are for wholesalers
          const isForWholesaler = 
            notification.type === 'order_approved' || 
            notification.type === 'order_rejected';
          
          return isManufacturerNotification && !isForWholesaler;
        })
        .map(notification => ({
          ...notification,
          dbId: notification.id,
          id: `notification_${notification.id}_${Date.now()}`,
          timestamp: new Date(notification.created_at || notification.timestamp || Date.now()),
          read: notification.is_read === 1,
          extractedOrderId: extractOrderIdFromMessage(notification.message)
        }));
      
      console.log('✅ Filtered manufacturer notifications:', notificationsWithDates.length);
      
      setNotifications(notificationsWithDates);
      
      // Calculate unread count from filtered notifications
      const unreadFiltered = notificationsWithDates.filter(n => !n.read).length;
      setUnreadCount(unreadFiltered);
      
      // Cache the unread count
      try {
        localStorage.setItem('notification_unread_count', unreadFiltered.toString());
      } catch (cacheError) {
        console.warn('⚠️ Could not cache unread count:', cacheError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
  } finally {
    setIsLoading(false);
  }
}, [getUserData]);
const handleOrderAction = useCallback(async (orderId, action, rejectionReason = '') => {
  const orderIdStr = String(orderId).replace('[object Object]', '').trim();
  
  console.log(`🔄 Processing order: ${orderIdStr}`);
  try {
    const userData = getUserData();
    if (!userData?.id) {
      console.error('❌ No manufacturer user data found');
      alert('Error: You need to be logged in to perform this action');
      return false;
    }

    // ✅ FIX: Ensure orderId is a string, not an object
    const orderIdStr = typeof orderId === 'string' ? orderId : 
                      (orderId?.toString ? orderId.toString() : 
                      (orderId?.orderId || orderId?.id || 'UNKNOWN'));
    
    console.log(`🔄 ${action === 'accept' ? 'Accepting' : 'Rejecting'} order:`, orderIdStr);
    
    // Get current notifications from state at the moment of action
    const currentNotifications = notifications;
    
    console.log('📋 Current notifications count:', currentNotifications.length);
    
    // Find the notification for this order
    const notificationToRemove = currentNotifications.find(notification => {
      const extractedId = notification.extractedOrderId || 
                         notification.orderId || 
                         notification.related_order_id;
      
      // Convert both to string for comparison
      const extractedStr = extractedId?.toString();
      const orderIdToCompare = orderIdStr?.toString();
      
      return extractedStr === orderIdToCompare || 
             notification.message?.includes(orderIdStr) ||
             (notification.message && notification.message.includes(`#${orderIdStr}`));
    });

    console.log('🔍 Found notification to remove:', notificationToRemove);

    // Use the accept/reject endpoint
    const endpoint = action === 'accept' 
      ?  `${API_BASE_URL}/orders/${orderIdStr}/accept-with-invoice`
      : `${API_BASE_URL}/orders/${orderIdStr}/reject`;
    
    console.log('📤 Sending request to:', endpoint);
    
    // Prepare payload for accept endpoint - use simpler structure
    const payload = action === 'accept' 
      ? { 
          manufacturer_id: userData.id,
          user_id: userData.id
        }
      : { 
          rejection_reason: rejectionReason || 'No reason provided', // ✅ FIX: Use rejection_reason (with underscore)
          user_id: userData.id 
        };
    
    console.log('📦 Payload:', payload);

    try {
      const response = await axios.put(endpoint, payload, { // ✅ FIX: Use PUT method
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`✅ Response from ${endpoint}:`, response.data);
      
      if (response.data && response.data.success) {
        console.log(`🎉 Order ${action === 'accept' ? 'approved' : 'rejected'} successfully`);
        
        // ✅ Remove notification from UI immediately
        if (notificationToRemove) {
          console.log(`🗑️ Removing notification from UI:`, notificationToRemove.id);
          setNotifications(prev => prev.filter(n => {
            // Remove by database ID if available, otherwise by frontend ID
            return n.id !== notificationToRemove.id && 
                   (!notificationToRemove.dbId || n.dbId?.toString() !== notificationToRemove.dbId.toString());
          }));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        // ✅ Add success notification
        addNotification({
          type: `order_${action === 'accept' ? 'approved' : 'rejected'}`,
          title: `Order ${action === 'accept' ? 'Approved' : 'Rejected'}`,
          message: `Order #${orderIdStr} has been ${action === 'accept' ? 'approved' : 'rejected'}${action === 'reject' ? ': ' + rejectionReason : ''}`,
          timestamp: new Date(),
          status: action === 'accept' ? 'approved' : 'rejected',
          read: true
        });
        
        return true;
      } else {
        console.error('❌ Backend reported failure:', response.data?.message);
        alert(`❌ Failed: ${response.data?.message || 'Unknown error'}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint} failed:`, error);
      
      // More detailed error handling
      let errorMessage = 'Unknown error';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.error('❌ Error message:', errorMessage);
      }
      
      if (error.response?.status === 404) {
        errorMessage = `Endpoint not found: ${endpoint}. Please check your backend routes.`;
      }
      
      if (error.response?.status === 500) {
        errorMessage = 'Internal server error. Please check server logs or try again later.';
      }
      
      // Check if it's a "already processed" error
      if (errorMessage.toLowerCase().includes('already') || 
          errorMessage.toLowerCase().includes('order is already') ||
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('invalid')) {
        
        console.log(`⚠️ Order ${orderIdStr} was already processed, removing notification anyway`);
        
        // ✅ IMPORTANT: Remove notification from UI even if order is already processed
        if (notificationToRemove) {
          console.log(`🗑️ Removing already-processed notification from UI:`, notificationToRemove.id);
          setNotifications(prev => prev.filter(n => n.id !== notificationToRemove.id));
          setUnreadCount(prev => Math.max(0, prev - 1));
          
          // Also try to remove from backend via the delete endpoint
          if (notificationToRemove.dbId) {
            try {
              await axios.delete(`${API_BASE_URL}/notifications/${notificationToRemove.dbId}`);
              console.log('✅ Notification deleted from backend');
            } catch (deleteErr) {
              console.warn('⚠️ Could not delete notification from backend:', deleteErr.message);
            }
          }
          
          // Show info message to user
          alert(`ℹ️ Order #${orderIdStr} was already ${action === 'accept' ? 'approved' : 'rejected'}. Notification removed.`);
          return true; // Consider this handled
        }
      }
      
      alert(`❌ Error: ${errorMessage}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error in handleOrderAction:`, error);
    alert(`❌ Unexpected error: ${error.message}`);
    return false;
  }
}, [getUserData, notifications, setNotifications, addNotification, setUnreadCount]);const clearNotification = useCallback((id) => {
  console.log('🗑️ Clearing notification:', id);
  
  setNotifications(prev => {
    const notification = prev.find(n => n.id === id || n.dbId?.toString() === id.toString());
    if (notification && !notification.read) {
      // Update unread count if notification was unread
      setUnreadCount(unreadPrev => Math.max(0, unreadPrev - 1));
    }
    
    const filtered = prev.filter(n => n.id !== id && n.dbId?.toString() !== id.toString());
    console.log(`📋 Removed 1 notification, ${filtered.length} remaining`);
    return filtered;
  });
}, []);


  // Add markAsRead function in NotificationProvider before openOrderModal
const markAsRead = useCallback((id) => {
  setNotifications(prev => 
    prev.map(notification => {
      if (notification.id === id && !notification.read) {
        // Only decrease count if it wasn't already read
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        return { ...notification, read: true };
      }
      return notification;
    })
  );
}, []);

  const openOrderModal = useCallback((notification) => {
    console.log('📦 Opening modal with notification:', notification);
    
    // Debug the notification structure
    console.log('🔍 Notification structure for debugging:', {
      id: notification.id,
      type: notification.type,
      extractedOrderId: notification.extractedOrderId,
      message: notification.message,
      related_order_id: notification.related_order_id
    });
    
    // Use extracted order ID if available, otherwise fall back
    const orderId = notification.extractedOrderId || notification.related_order_id;
    console.log('🎯 Using order ID:', orderId);
    
    setSelectedOrder({
      ...notification,
      orderId: orderId
    });
    setShowOrderModal(true);
    
    // Mark as read if it has an ID
    if (notification.id) {
      markAsRead(notification.id);
    }
  }, [markAsRead]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);
useEffect(() => {
  const newSocket = io("http://localhost:8080", {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  setSocket(newSocket);

  // ✅ ADD: Debug all events
  newSocket.onAny((eventName, ...args) => {
    console.log(`🔍 [Manufacturer Frontend] Socket event: ${eventName}`, args);
  });

  newSocket.on('connect', () => {
    console.log('✅ Manufacturer connected to server, socket ID:', newSocket.id);
    
    const userData = getUserData();
    if (userData?.id) {
      newSocket.emit('join-manufacturer', userData.id);
      console.log(`🏭 Joined manufacturer room: ${userData.id}`);
    }
  });

  // Listen for new orders - BOTH events just in case
  newSocket.on("newOrder", (data) => {
    console.log("📦 NEW ORDER (via 'newOrder' event):", data);
    // Handle notification...
  });

  newSocket.on("newOrderNotification", (data) => {
    console.log("📦 NEW ORDER (via 'newOrderNotification' event):", data);
    // Handle notification...
  });

  newSocket.on("orderRequest", (data) => {
    console.log("📦 NEW ORDER (via 'orderRequest' event):", data);
    // Handle notification...
  });

  newSocket.on("newOrderReceived", (data) => {
    console.log("📦 NEW ORDER (via 'newOrderReceived' event):", data);
    
      // Create browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification('New Order Request', {
          body: `New order #${data.orderId} from wholesaler`,
          icon: logo,
          tag: `order-${data.orderId}`
        });
      }
      
      // Add to local notifications
      addNotification({
        type: 'new_order',
        title: 'New Order Request',
        message: `New order #${data.orderId} received from wholesaler`,
        timestamp: new Date(),
        orderId: data.orderId,
        extractedOrderId: data.orderId,
        orderData: data
      });
    });

   // Heartbeat to stay connected
const heartbeatInterval = setInterval(() => {
  if (newSocket.connected) {
    const userData = getUserData(); // ✅ Use existing getUserData function
    newSocket.emit('heartbeat', { type: 'manufacturer', userId: userData?.id });
  }
}, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      console.log('🔌 Disconnecting manufacturer socket...');
      newSocket.disconnect();
    };
  }, [addNotification]);

  // Initialize: fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      addNotification,
      handleOrderAction,
      fetchNotifications,
      socket,
      openOrderModal,
      selectedOrder,
    setSelectedOrder,
      showOrderModal,
      setShowOrderModal
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// ✅ NOW define useNotifications hook AFTER NotificationProvider
const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Update NotificationDialog to handle both notification and order data
const NotificationDialog = ({ notification, onClose, onAccept, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!notification) return null;

  // Get the order ID - use extractedOrderId if available
  const orderId = notification.extractedOrderId || notification.orderId || notification.related_order_id;
  
  console.log('🎯 NotificationDialog - Order ID to use:', orderId);
  console.log('📋 Full notification:', notification);

  const handleAccept = async () => {
    if (!orderId) {
      console.error('❌ No order ID found in notification');
      alert('Error: Could not find order ID in notification');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onAccept(orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {  // ✅ Fixed: No parameter needed
    if (!orderId) {
      console.error('❌ No order ID found in notification');
      alert('Error: Could not find order ID in notification');
      return;
    }
    
    setIsProcessing(true);
    try {
      // ✅ FIX: Get user data
      const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      
      if (!userData?.id) {
        alert("User not found. Please login again.");
        return;
      }
      
      const response = await axios.put(
        `${API_BASE_URL}/orders/${orderId}/reject`,  // ✅ Use API_BASE_URL
        {
          manufacturerId: userData.id,
          rejection_reason: rejectionReason || "No reason provided"
        }
      );
      
      if (response.data.success) {
        console.log("✅ Order rejected:", response.data);
        
        // Call parent's onReject to update state
        onReject(orderId, rejectionReason);
        
        // Close dialog
        onClose();
      }
    } catch (error) {
      console.error("❌ Error rejecting order:", error);
      alert(error.response?.data?.message || "Failed to reject order");
    } finally {
      setIsProcessing(false);
    }
  };
  // Extract product details from message
  const extractProductDetails = (message) => {
    if (!message) return { product: 'Unknown Product', quantity: 1, total: 0 };
    
    const productMatch = message.match(/for (.+?) \(/);
    const quantityMatch = message.match(/Quantity: (\d+)/);
    const totalMatch = message.match(/\$(\d+\.?\d*)/);
    
    return {
      product: productMatch ? productMatch[1] : 'Unknown Product',
      quantity: quantityMatch ? parseInt(quantityMatch[1]) : 1,
      total: totalMatch ? parseFloat(totalMatch[1]) : 0
    };
  };

  const productDetails = extractProductDetails(notification.message);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Order Approval Required</h3>
          <p className="text-gray-600 text-sm mt-1">
            Review and take action on this order
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">New Order Request</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Order ID:</span>
              <p className="text-gray-800 font-mono">{orderId || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Product:</span>
              <p className="text-gray-800">{productDetails.product}</p>
            </div>
            <div>
              <span className="text-gray-600">Quantity:</span>
              <p className="text-gray-800">{productDetails.quantity} units</p>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <p className="text-green-600 font-bold">${productDetails.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Order Message */}
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-700 text-sm">{notification.message}</p>
          </div>

          {/* Rejection Reason Input */}
          <div className="mt-4">
            <label className="block text-gray-700 text-sm mb-2">
              Rejection Reason (if rejecting):
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Provide reason for rejection..."
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="mb-4">
            <h4 className="text-gray-800 font-semibold mb-3">Choose Action:</h4>
            <div className="grid grid-cols-2 gap-3">
             <button
  onClick={handleReject}  // ✅ Use the prop passed from parent
  disabled={isProcessing}
  className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isProcessing ? (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  ) : (
    <>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Reject Order
    </>
  )}
</button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept Order
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Accepting will generate and send invoice to wholesaler</p>
            <p>• Rejecting will notify wholesaler with reason</p>
            <p>• Both actions will update order status accordingly</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => {
              console.log('🔍 Debug order ID:', orderId);
              console.log('🔍 Debug notification:', notification);
              alert(`Order ID: ${orderId}\nFull details in console`);
            }}
            className="text-gray-600 hover:text-blue-600 px-4 py-2 transition-colors text-sm"
          >
            Debug Info
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-600 hover:text-gray-800 px-4 py-2 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationBellWithModal = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification,
    openOrderModal,
    handleOrderAction,
    selectedOrder,
    showOrderModal,
    setShowOrderModal,
    fetchNotifications,
    setSelectedOrder // Add this - it comes from useNotifications
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (notifications.length > 0) {
      setIsInitialLoad(false);
    }
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    console.log('📦 Notification clicked:', notification);
    
    // Check for both 'new_order' AND 'order_request' types
    if (notification.type === 'new_order' || notification.type === 'order_request') {
      console.log('🚀 Calling openOrderModal...');
      openOrderModal(notification);
      
      // Mark as read on backend
      if (notification.dbId && !notification.read) {
        try {
          await axios.patch(`${API_BASE_URL}/notifications/${notification.dbId}/read`);
          console.log('✅ Notification marked as read on backend');
        } catch (error) {
          console.warn('⚠️ Could not mark notification as read:', error.message);
        }
      }
    } else {
      // Mark other notifications as read on click
      if (!notification.read) {
        if (notification.dbId) {
          try {
            await axios.patch(`${API_BASE_URL}/notifications/${notification.dbId}/read`);
          } catch (error) {
            console.warn('⚠️ Could not mark notification as read:', error);
          }
        }
        markAsRead(notification.id);
      }
    }
    setIsOpen(false);
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log(`🔄 Accepting order: ${orderId}`);
      
      // Get user ID
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData || !userData.id) {
        console.error("User data not found. Please log in again.");
        alert("User data not found. Please log in again.");
        return;
      }

      // Call the API
      const response = await axios.post(
        `http://localhost:8080/api/orders/${orderId}/accept-with-invoice`,
        {
          userId: userData.id,
          manufacturer_id: userData.id
        }
      );

      if (response.data.success) {
        console.log('✅ Order accepted successfully:', response.data);
        
        // Log success to console
        console.log(`✅ Order accepted! Invoice ${response.data.invoiceNumber} generated.`);
        
        // Remove notification from UI
        if (selectedOrder?.id) {
          clearNotification(selectedOrder.id);
        }
        
        // Close the modal - use setSelectedOrder from context
        if (setSelectedOrder) {
          setSelectedOrder(null);
        }
        setShowOrderModal(false);
        
        // Refresh notifications
        fetchNotifications();
        
        // Show success message
        alert(`Order accepted successfully! Invoice ${response.data.invoiceNumber} generated.`);
        
      } else {
        throw new Error(response.data.message || 'Failed to accept order');
      }
      
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      
      let errorMessage = error.message;
      
      // Handle specific errors
      if (error.response?.data?.error?.includes('gst_percentage')) {
        errorMessage = `
          Database Schema Error:
          The products table is missing the 'gst_percentage' column.
          Please run: ALTER TABLE products ADD COLUMN gst_percentage DECIMAL(5,2) DEFAULT 18.00
        `;
      }
      
      console.error(`❌ Error: ${errorMessage}`);
      
      // Show alert to user
      alert(`Error: ${errorMessage}`);
    }
  };
const handleRejectOrder = async (orderId, rejectionReason) => {
  // ✅ FIX: Extract string from object if needed
  if (orderId && typeof orderId === 'object') {
    orderId = orderId.orderId || orderId.extractedOrderId || orderId.id || 'UNKNOWN';
  }  console.log('❌ Rejecting order with:', { orderId, rejectionReason });
  
  // Debug: Check what type orderId is
  console.log('🔍 Type of orderId:', typeof orderId, 'Value:', orderId);
  
  // If no reason provided, ask for it
  if (!rejectionReason || rejectionReason.trim() === '') {
    rejectionReason = prompt("Please provide a reason for rejection:");
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      alert("Please provide a rejection reason");
      return;
    }
  }
  
  // Ensure orderId is a string
  const orderIdStr = typeof orderId === 'string' ? orderId : 
                    (orderId?.toString ? orderId.toString() : 
                    (orderId?.orderId || orderId?.id || 'UNKNOWN'));
  
  console.log('🔍 Processed order ID:', orderIdStr);
  
  if (!window.confirm(`Are you sure you want to reject order ${orderIdStr}?`)) {
    return;
  }
  
  // Close modal immediately for better UX
  setShowOrderModal(false);
  if (setSelectedOrder) {
    setSelectedOrder(null);
  }
  
  const success = await handleOrderAction(orderId, 'reject', rejectionReason);
    if (success) {
    // Refresh notifications after action
    setTimeout(() => fetchNotifications(), 500);
  }
};


  // Add debugging
  useEffect(() => {
    console.log('🔔 Current unread count:', unreadCount);
    console.log('📋 Total notifications:', notifications.length);
    
    // Debug new order notifications
    const newOrderNotifications = notifications.filter(n => n.type === 'new_order' || n.type === 'order_request');
    console.log('📦 New order notifications:', newOrderNotifications.map(n => ({
      id: n.id,
      extractedOrderId: n.extractedOrderId,
      message: n.message?.substring(0, 50) + '...'
    })));
  }, [notifications, unreadCount]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 relative"
      >
        <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
        {isInitialLoad ? (
          // Show loading indicator instead of 0
          <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-gray-400 text-white text-xs rounded-full flex items-center justify-center font-medium">
            <div className="w-2 h-2 border-1 border-white border-t-transparent rounded-full animate-spin"></div>
          </span>
        ) : unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 lg:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-800 font-semibold">Notifications ({notifications.length})</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllAsRead();
                      setIsOpen(false);
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => {
                    fetchNotifications();
                    setIsOpen(false);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications</p>
                <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                    !notification.read && "bg-blue-50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          !notification.read ? "bg-blue-500" : 
                          notification.status === 'approved' ? "bg-green-500" :
                          notification.status === 'rejected' ? "bg-red-500" : "bg-gray-400"
                        )} />
                        <span className="text-gray-800 font-medium text-sm">
                          {notification.title || 'New Order Request'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">
                          {notification.timestamp ? 
                            new Date(notification.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                            : 'Recent'}
                        </span>
                        <div className="flex items-center gap-2">
                          {notification.status === 'approved' && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                              Approved
                            </span>
                          )}
                          {notification.status === 'rejected' && (
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                              Rejected
                            </span>
                          )}
                          {(notification.type === 'new_order' || notification.type === 'order_request') && !notification.status && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                        setIsOpen(false);
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2 p-1 rounded hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Order Approval Modal */}
      {showOrderModal && selectedOrder && (
        <NotificationDialog
          notification={selectedOrder}
          onClose={() => {
            setShowOrderModal(false);
            if (setSelectedOrder) {
              setSelectedOrder(null);
            }
          }}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
        />
      )}
    </div>
  );
};

// Updated ProfileDropdown component
const ProfileDropdown = ({ userData, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Get first letter of name or email
  const getInitial = () => {
    if (userData.name && userData.name !== 'Not provided') {
      return userData.name.charAt(0).toUpperCase();
    } else if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleEditClick = (field) => {
    setEditingField(field);
    setEditValue(userData[field] === 'Not provided' ? '' : userData[field] || '');
  };
const handleSave = async (field) => {
  try {
    console.log(`Saving ${field}: ${editValue}`);
    
    // Get user ID
    const getUserDataFromStorage = () => {
      try {
        let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (!userData) return null;
        return JSON.parse(userData);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
      }
    };

    const storedUser = getUserDataFromStorage();
    
    if (storedUser?.id) {
      // Prepare data based on what's being updated
      const updateData = {
        name: field === 'name' ? editValue : userData.name,
        phone: field === 'phone' ? editValue : userData.phone,
        businessName: field === 'businessName' ? editValue : userData.businessName
      };
      
      // Call API to update user data
      const response = await axios.put(`${API_BASE_URL}/users/${storedUser.id}`, updateData);

      if (response.data && response.data.success) {
        // Update local storage
        const updatedUser = {
          ...storedUser,
          fullName: updateData.name,
          name: updateData.name,
          phoneNumber: updateData.phone,
          phone: updateData.phone,
          businessname: updateData.businessName,
          businessName: updateData.businessName
        };
        
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        
        // Update UI state
        setUserData(prev => ({
          ...prev,
          [field]: editValue
        }));
        
        alert(`✅ ${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      } else {
        alert(`❌ Failed to update ${field}`);
      }
    } else {
      alert('User not found. Please login again.');
    }
    
    setEditingField(null);
    setEditValue('');
    
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    alert(`Error saving ${field}: ${error.message}`);
  }
};
  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const getPlaceholder = (field) => {
    switch(field) {
      case 'phone': return '+91 XXXXXXXXXX';
      case 'businessName': return 'Your Business Name';
      case 'name': return 'Your Full Name';
      case 'email': return 'email@example.com';
      default: return 'Enter value';
    }
  };

  const getLabel = (field) => {
    switch(field) {
      case 'phone': return 'Mobile Number';
      case 'businessName': return 'Business Name';
      case 'name': return 'Username';
      case 'email': return 'Email Address';
      default: return field;
    }
  };

  const renderField = (field) => {
    const isEditing = editingField === field;
    const label = getLabel(field);
    const value = userData[field];
    const isEmpty = !value || value === 'Not provided';
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-700 text-sm font-medium">{label}</span>
          {!isEditing && (
            <button
              onClick={() => handleEditClick(field)}
              className="text-purple-600 hover:text-purple-700 text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              {isEmpty ? 'Add' : 'Edit'}
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <input
              type={field === 'email' ? 'email' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={getPlaceholder(field)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSave(field)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-gray-800 text-sm ${isEmpty ? 'text-gray-500 italic' : ''}`}>
            {isEmpty ? getPlaceholder(field) : value}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Profile Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm lg:text-base hover:opacity-90 transition-opacity relative focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white"
      >
        {getInitial()}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-5 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-base">
                    {getInitial()}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">User profile details</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Username */}
              {renderField('name')}
              
              {/* Phone Number */}
              {renderField('phone')}
              
              {/* Email Address */}
              {renderField('email')}
              
              {/* Business Name */}
              {renderField('businessName')}
            </div>

            {/* Footer with Logout */}
            <div className="p-3 border-t border-gray-200">
                <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Fix the useMedicines hook - simplified version
const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const MEDICINES_API = "http://localhost:8080/api/medicines";

  const getUserData = useCallback(() => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (!userData) return null;
      const parsedData = JSON.parse(userData);
      return parsedData?.email ? parsedData : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }, []);

  // Fetch medicines from API
  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const user = getUserData();
      if (!user?.email) {
        console.error("❌ No user email found");
        setLoading(false);
        return;
      }

      console.log("🔍 Fetching medicines for user:", user.email);
      const response = await axios.get(`${MEDICINES_API}?user_email=${encodeURIComponent(user.email)}`);
      console.log("✅ Fetched medicines:", response.data.length);
      
      setMedicines(response.data);
      setError(null);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching medicines:", error);
      setError(error.message);
      setMedicines([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getUserData]);

  // Get medicines count
  const getMedicinesCount = useCallback(() => medicines.length, [medicines]);

  // Get low stock medicines count (less than 100)
  const getLowStockCount = useCallback(() => {
    const lowStock = medicines.filter(med => med.stock_qty < 100).length;
    console.log('📊 Low stock calculation:', {
      total: medicines.length,
      lowStock: lowStock
    });
    return lowStock;
  }, [medicines]);

  // Get total stock value
  const getTotalStockValue = useCallback(() => {
    return medicines.reduce((total, med) => {
      return total + (med.unit_price * med.stock_qty);
    }, 0);
  }, [medicines]);

  return {
    medicines,
    loading,
    error,
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

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();
  
  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/invoices')) return 'invoices';
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
      "bg-white border-r border-gray-200 flex flex-col h-full",
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
              alt="ManufacturerLogo" 
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
      <nav className="px-3 py-4 space-y-1 border-t border-gray-200">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
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

// Monthly Revenue Chart Component - Updated for white theme
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

  const getAreaPath = () => {
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
    
    path += ` L 100,100 L 0,100 Z`;
    
    return path;
  };

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
    <div className="h-full relative">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <path d={getAreaPath()} fill="url(#areaGradient)" />
        <path 
          d={getLinePath()} 
          fill="none" 
          stroke="url(#lineGradient)" 
          strokeWidth="1.5" 
        />
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Simplified month labels for mobile */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {revenueData.filter((_, index) => index % 3 === 0).map((item, index) => (
          <span 
            key={index} 
            className="text-gray-500 text-[10px] lg:text-xs"
          >
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
};

// Semi-Circle Chart Component for Stock Turnover - Updated for white theme
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
      <div className="relative w-32 h-16 mb-4">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * 0.82)}
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
            <div className="text-gray-800 font-bold text-lg">5.2x</div>
            <div className="text-gray-500 text-xs">Turnover</div>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-4 gap-1 text-gray-500 text-xs">
        {stockData.slice(0, 4).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-500 text-xs mt-1">
        {stockData.slice(4, 8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-500 text-xs mt-1">
        {stockData.slice(8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
    </div>
  );
};

// In DashboardContent component
const DashboardContent = () => {
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { 
    getMedicinesCount, 
    getLowStockCount, 
    getTotalStockValue,
    fetchMedicines,
    loading,
    medicines // Add this
  } = useMedicines();
const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    activeRetailers:0,
    pendingOrders: 0,
    medicinesCount: 0,
    lowStockCount: 0,
    totalStockValue: 0,
    isLoading: true
  });

  // ✅ Add missing userData state
  const [userData, setUserData] = useState({
    email: '',
    name: '',
    phone: '',
    businessName: ''
  });

  // ✅ Add missing handleLogout function
  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('userData');
    window.location.href = '/';
  };
  
  const fetchOrderStats = useCallback(async () => {
  try {
    const getUserDataFromStorage = () => {
      try {
        let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (!userData) return null;
        return JSON.parse(userData);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
      }
    };

    const user = getUserDataFromStorage();
    
    if (!user?.id) {
      console.error('❌ No user ID found for fetching order stats');
      return;
    }

    console.log('📊 Fetching order stats for manufacturer:', user.id);
    
    // Fetch orders from your API
    const response = await axios.get(`${API_BASE_URL}/orders/manufacturer/${user.id}`);
    
    if (response.data && response.data.success) {
      const orders = response.data.orders || [];
      
      // Calculate only what you need
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      
      // Calculate total revenue from approved orders only
      const approvedRevenue = orders
        .filter(order => order.status === 'approved')
        .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
      
      console.log('✅ Order stats calculated:', {
        totalOrders: orders.length,
        pendingOrders,
        approvedRevenue
      });
      
      // Update dashboard data with only what you need
      setDashboardData(prev => ({
        ...prev,
        pendingOrders,
        totalRevenue: approvedRevenue
      }));
      
    } else {
      console.error('❌ Failed to fetch order stats');
    }
  } catch (error) {
    console.error('❌ Error fetching order statistics:', error);
    // Set default values if API fails
    setDashboardData(prev => ({
      ...prev,
      pendingOrders: 0,
      totalRevenue: 0
    }));
  }
}, []);

  // ✅ Add missing fetchUserData function
  const fetchUserData = async () => {
    try {
      const getUserDataFromStorage = () => {
        try {
          let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
          if (!userData) {
            console.log('❌ No user data found in storage');
            return null;
          }
          const parsedData = JSON.parse(userData);
          console.log('📋 User data from storage:', parsedData);
          return parsedData;
        } catch (error) {
          console.error('❌ Error parsing user data:', error);
          return null;
        }
      };

      const storedUser = getUserDataFromStorage();
      
      if (!storedUser?.id) {
        console.error('❌ No user ID found in storage');
        setUserData({
          email: '',
          name: 'User',
          phone: 'Not provided',
          businessName: 'Not provided'
        });
        return;
      }

      console.log('🔍 Fetching user data for ID:', storedUser.id);
      
      // Fetch user data from API
      const response = await axios.get(`${API_BASE_URL}/users/${storedUser.id}`);
      
      if (response.data && response.data.success) {
        const apiUserData = response.data.user;
        console.log('✅ API user data:', apiUserData);
        
        setUserData({
          email: apiUserData.email || storedUser.email || '',
          name: apiUserData.name || storedUser.name || storedUser.fullName || storedUser.email?.split('@')[0] || 'User',
          phone: apiUserData.phone || storedUser.phoneNumber || storedUser.phone || 'Not provided',
          businessName: apiUserData.businessName || storedUser.businessname || storedUser.businessName || 'Not provided'
        });
      } else {
        // Fallback to stored data
        console.log('⚠️ API returned but not success, using stored data');
        setUserData({
          email: storedUser.email || '',
          name: storedUser.name || storedUser.fullName || storedUser.email?.split('@')[0] || 'User',
          phone: storedUser.phoneNumber || storedUser.phone || 'Not provided',
          businessName: storedUser.businessname || storedUser.businessName || 'Not provided'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      
      // Try to use localStorage as fallback
      try {
        const storedData = localStorage.getItem('userData');
        if (storedData) {
          const storedUser = JSON.parse(storedData);
          console.log('⚠️ Using localStorage data as fallback:', storedUser);
          
          setUserData({
            email: storedUser.email || '',
            name: storedUser.name || storedUser.fullName || storedUser.email?.split('@')[0] || 'User',
            phone: storedUser.phoneNumber || storedUser.phone || 'Not provided',
            businessName: storedUser.businessname || storedUser.businessName || 'Not provided'
          });
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setUserData({
          email: '',
          name: 'User',
          phone: 'Not provided',
          businessName: 'Not provided'
        });
      }
    }
  };
   
  const { fetchNotifications: fetchNotificationsFromContext } = useNotifications();

  // ✅ Fix: Update dashboard data when medicines change
  useEffect(() => {
    if (medicines.length > 0 && !loading) {
      const medicinesCount = getMedicinesCount();
      const lowStockCount = getLowStockCount();
      const totalStockValue = getTotalStockValue();
      
      console.log('📊 Updating dashboard data:', {
        medicinesCount,
        lowStockCount,
        totalStockValue
      });
      
      setDashboardData(prev => ({
        ...prev,
        medicinesCount,
        lowStockCount,
        totalStockValue,
        isLoading: false
      }));
    } else if (medicines.length === 0 && !loading) {
      // If no medicines but loading is complete
      setDashboardData(prev => ({
        ...prev,
        medicinesCount: 0,
        lowStockCount: 0,
        totalStockValue: 0,
        isLoading: false
      }));
    }
  }, [medicines, loading, getMedicinesCount, getLowStockCount, getTotalStockValue]);

// Update your useEffect in DashboardContent
useEffect(() => {
  console.log('🚀 DashboardContent mounted, initializing data...');
  
  const initializeData = async () => {
    try {
      // 1️⃣ Fetch user data first
      await fetchUserData();
      
      // 2️⃣ Fetch notifications
      if (fetchNotificationsFromContext) {
        await fetchNotificationsFromContext();
        console.log('✅ Notifications fetched');
      }
      
      // 3️⃣ Fetch order statistics
      await fetchOrderStats();
      
      // 4️⃣ Fetch medicines
      await fetchMedicines();
      
      console.log('✅ All dashboard data initialized');
    } catch (error) {
      console.error('❌ Error initializing dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };

  initializeData();
  
  // Set up refresh interval for dashboard data
  const intervalId = setInterval(() => {
    fetchOrderStats();
    fetchMedicines();
  }, 30000); // Refresh every 30 seconds
  
  return () => {
    console.log('🧹 DashboardContent unmounting');
    clearInterval(intervalId);
  };
}, [fetchNotificationsFromContext, fetchOrderStats, fetchMedicines]); 
  
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

 // Format currency
const formatCurrency = (amount) => {
  // Convert to number and check if it's valid
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return '₹0.00';
  }
return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};
  
  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(number);
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
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
                      <h1 className="text-xl lg:text-2xl font-bold text-black">Manufacturer</h1>
                    </div>
                  </div>
        
                  
                  <div className="flex items-center gap-2 lg:gap-4">
                    {/* Search Bar - Hidden on mobile */}
                    <div className="relative hidden md:block">
                      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search products, orders, retailers..."
                        className="bg-white border-b border-gray-200 rounded-lg pl-10 pr-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-60 lg:w-80"
                      />
                    </div>
                    
                    {/* Notification Bell */}
                    <NotificationBellWithModal />
                    
                    {/* Profile Dropdown */}
                    <ProfileDropdown 
                      userData={userData}
                      onLogout={handleLogout}
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
        {/* Stats Grid - Fixed and working */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {/* Total Revenue Card - Clickable */}
          <button 
            onClick={() => navigate('/manufacturer/orders')}
            className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left w-full"
          >
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg font-bold">₹</span>
                </div>
                <h3 className="text-gray-800 text-sm lg:text-base font-medium">Total Revenue</h3>
              </div>
              <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded border border-green-200">
                Approved
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {dashboardData.isLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
              ) : (
                formatCurrency(dashboardData.totalRevenue)
              )}
            </div>
            <p className="text-gray-500 text-xs lg:text-sm">
              Revenue from approved orders
            </p>
            <div className="mt-4 flex items-center justify-end">
              <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                View Orders
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>

          {/* Pending Orders Card - Clickable */}
          <button 
            onClick={() => navigate('/manufacturer/orders')}
            className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left w-full"
          >
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
                </div>
                <h3 className="text-gray-800 text-sm lg:text-base font-medium">Pending Orders</h3>
              </div>
              <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-1 rounded border border-yellow-200">
                {dashboardData.pendingOrders > 0 ? 'Action Required' : 'All Good'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {dashboardData.isLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                dashboardData.pendingOrders
              )}
            </div>
            <p className="text-gray-500 text-xs lg:text-sm">
              Orders awaiting your approval
            </p>
            <div className="mt-4 flex items-center justify-end">
              <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                View Orders
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>

          {/* Total Products Card - Clickable */}
          <button 
            onClick={() => navigate('/manufacturer/inventory')}
            className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left w-full"
          >
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                </div>
                <h3 className="text-gray-800 text-sm lg:text-base font-medium">Total Products</h3>
              </div>
              <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded border border-purple-200">
                {dashboardData.medicinesCount > 0 ? 'Active' : 'None'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {dashboardData.isLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                dashboardData.medicinesCount
              )}
            </div>
            <p className="text-gray-500 text-xs lg:text-sm">
              Products in inventory
            </p>
            <div className="mt-4 flex items-center justify-end">
              <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                View Inventory
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>

          {/* Low Stock Card - Clickable */}
          <button 
            onClick={() => navigate('/manufacturer/inventory')}
            className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left w-full"
          >
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                </div>
                <h3 className="text-gray-800 text-sm lg:text-base font-medium">Low Stock</h3>
              </div>
              {dashboardData.isLoading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
              ) : (
                <span className="bg-red-50 text-red-700 text-xs font-medium px-2 py-1 rounded border border-red-200">
                  {dashboardData.medicinesCount > 0 
                    ? Math.round((dashboardData.lowStockCount / dashboardData.medicinesCount) * 100) + '%'
                    : '0%'
                  }
                </span>
              )}
            </div>
            <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {dashboardData.isLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                dashboardData.lowStockCount
              )}
            </div>
            <p className="text-gray-500 text-xs lg:text-sm">
              Products below reorder level
            </p>
            <div className="mt-4 flex items-center justify-end">
              <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                View Inventory
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>
        </div>
        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* Order Fulfillment Rate */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold text-gray-800">Order Fulfillment</h3>
              <div className="flex items-center gap-2 text-gray-500 text-xs lg:text-sm">
                <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                <span>Dec 2024</span>
              </div>
            </div>
            
            {/* Total Orders Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">Total Orders</span>
                <span className="text-gray-900 font-semibold">1.4K</span>
              </div>
            </div>
            
            <div className="space-y-4 lg:space-y-5">
              {orderFulfillmentData.map((item, index) => {
                const statusInfo = getStatusInfo(item.status);
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div style={{ color: statusInfo.color }} className="flex-shrink-0">
                          {statusInfo.icon}
                        </div>
                        <span className="text-gray-800 text-sm lg:text-base font-medium">{item.status}</span>
                      </div>
                      <span className="text-gray-900 font-semibold text-base lg:text-lg ml-2 flex-shrink-0">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="text-xs lg:text-sm text-gray-500">
                      {formatCompactNumber(item.orders)} orders
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 lg:h-2.5">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
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
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex-1">
                <h3 className="text-base lg:text-lg font-semibold text-gray-800">Monthly Revenue</h3>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">December 2024 Performance</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-xs lg:text-sm font-medium px-3 py-1 rounded-full border border-green-200">
                <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                +15% growth
              </div>
            </div>
            
            {/* Chart Container */}
            <div className="h-40 lg:h-48 mb-4">
              <MonthlyRevenueChart />
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 lg:gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Current</div>
                <div className="text-gray-900 font-semibold text-sm lg:text-base">$350K</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Average</div>
                <div className="text-gray-900 font-semibold text-sm lg:text-base">$246K</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Peak</div>
                <div className="text-green-600 font-semibold text-sm lg:text-base">Dec</div>
              </div>
            </div>
          </div>

          {/* Stock Turnover Rate */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-base lg:text-lg font-semibold text-gray-800">Stock Turnover</h3>
            </div>
            
            <div className="flex justify-center mb-4 lg:mb-6">
              <StockTurnoverChart />
            </div>
            
            <div className="grid grid-cols-3 gap-3 lg:gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Avg Turnover</div>
                <div className="text-gray-900 font-semibold text-sm lg:text-base">4.3x</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Growth</div>
                <div className="text-green-600 font-semibold text-sm lg:text-base">+18.5%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs lg:text-sm mb-1">Peak Month</div>
                <div className="text-gray-900 font-semibold text-sm lg:text-base">Dec - 5.2x</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManufacturerDashboard = () => {
  return (
    <MobileMenuProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-white">
          <Sidebar />
          <DashboardContent />
        </div>
      </NotificationProvider>
    </MobileMenuProvider>
  );
};
export default ManufacturerDashboard;