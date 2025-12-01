import React, { useState } from 'react';
// Notification Dialog Component
const NotificationDialog = ({ notification, onClose, onAccept, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const orderData = notification.orderData || notification;
  
  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(orderData.order_id || orderData.orderId || orderData.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onReject(orderData.order_id || orderData.orderId || orderData.id, rejectionReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Order Approval Required</h3>
          <p className="text-gray-400 text-sm mt-1">
            Review and take action on this order request
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Order ID:</span>
              <p className="text-white font-mono">
                {orderData.order_id || orderData.orderId || orderData.id}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Wholesaler:</span>
              <p className="text-white">{orderData.wholesaler_name || 'Unknown Wholesaler'}</p>
            </div>
            <div>
              <span className="text-gray-400">Product:</span>
              <p className="text-white">{orderData.product_name || orderData.productName}</p>
            </div>
            <div>
              <span className="text-gray-400">Quantity:</span>
              <p className="text-white">{orderData.quantity} units</p>
            </div>
            <div>
              <span className="text-gray-400">Unit Price:</span>
              <p className="text-white">${orderData.unit_price}</p>
            </div>
            <div>
              <span className="text-gray-400">Total Amount:</span>
              <p className="text-green-400 font-bold">${orderData.total_amount}</p>
            </div>
          </div>
          
          {/* Rejection Reason Input */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Rejection Reason (if rejecting):
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide reason for rejection..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="3"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {isSubmitting ? 'Rejecting...' : 'Reject Order'}
            </button>
            <button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isSubmitting ? 'Accepting...' : 'Accept Order'}
            </button>
          </div>
          
          <div className="text-xs text-gray-400 space-y-1 mt-3">
            <p>• Accepting will reduce inventory and notify wholesaler</p>
            <p>• Rejecting will notify wholesaler with your reason</p>
            <p>• Both actions update order status in real-time</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white px-4 py-2 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDialog;