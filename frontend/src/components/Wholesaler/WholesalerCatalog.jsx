import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api/apiconfig";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  FileText, 
  Mail, 
  Ship, 
  Zap, 
  LogOut, 
  Search, 
  Building, 
  MapPin, 
  ArrowLeft,
  Eye,
  Calendar,
  CreditCard,
  DollarSign,
  Send,
  User,
  Hash,
  Box,
  Home
} from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png'

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Add this helper function
const getImageUrl = (imagePath) => {
  if (!imagePath || imagePath === 'No image' || imagePath === 'NULL') return null;
  
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('blob:')) return imagePath;
  if (imagePath.startsWith('/')) {
    return `http://localhost:8080${imagePath}`;
  }
  return `http://localhost:8080/uploads/${imagePath}`;
};

// Sidebar Component
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Package, label: "Inventory", id: "inventory" },
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

  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/catalog')) return 'catalog';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'catalog';
  };

  const activeItem = getActiveItem();

  const handleNavigation = (itemId) => {
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

  return (
    <aside className="w-64 h-screen bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          <img 
            src={logo} 
            alt="Wholesaler Pro Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xl font-semibold text-white">Wholesaler</span>
      </div>

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

      <div className="p-4 border-t border-gray-700">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

// ClipboardList component
const ClipboardList = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1-2-2h2"/>
    <path d="M12 11h4"/>
    <path d="M12 16h4"/>
    <path d="M8 11h.01"/>
    <path d="M8 16h.01"/>
  </svg>
);

// Product Card Component
const ProductCard = ({ product, onViewDetails }) => {
  const imageUrl = getImageUrl(product.image);

  const handleImageClick = () => {
    onViewDetails(product);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 overflow-hidden">
      {/* Image Section */}
      <div 
        className="relative h-48 bg-gray-700 cursor-pointer group"
        onClick={handleImageClick}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.error(`Image failed to load for ${product.name}:`, product.image);
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-600">
            <div className="text-center text-gray-400">
              <div className="text-3xl mb-2">💊</div>
              <span className="text-sm">No Image</span>
            </div>
          </div>
        )}
        
        {/* View Details Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <div className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Eye size={16} />
              View Details
            </div>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-green-400 font-bold text-lg">
            ${parseFloat(product.unit_price || 0).toFixed(2)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            (product.stock_qty || 0) > 0 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {product.stock_qty > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Order Form Component
const OrderFormSection = ({ 
  product, 
  manufacturer, 
  onBack, 
  onOrderSuccess 
}) =>{  const getMinDeliveryDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    return minDate.toISOString().split('T')[0];
  };

  const getDefaultDeliveryDate = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    return defaultDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    quantity: 1,
    payment_mode: "online",
    preferred_delivery_date: getDefaultDeliveryDate(), // Auto-filled
    notes: "",
    delivery_address: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wholesalerInfo, setWholesalerInfo] = useState(null);
  const [orderId, setOrderId] = useState("");

  // Generate order ID on component mount
  useEffect(() => {
    const generatedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setOrderId(generatedOrderId);
  }, []);

  // Calculate order details
  const calculateOrderDetails = () => {
    if (!product) return {};
    
    const quantity = parseInt(formData.quantity) || 1;
    const unitPrice = parseFloat(product.unit_price) || 0;
    const subtotal = quantity * unitPrice;
    const gstAmount = subtotal * 0.18; // Assuming 18% GST
    const totalAmount = subtotal + gstAmount;

    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      unitPrice: unitPrice.toFixed(2),
      quantity: quantity
    };
  };

  const orderDetails = calculateOrderDetails();

// Fetch wholesaler info - FIXED VERSION
useEffect(() => {
  const fetchWholesalerInfo = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      console.log("User data from localStorage:", userData);
      
      if (userData.id) {
        // Use the dedicated wholesaler endpoint
        const response = await axios.get(`${API_BASE_URL}/wholesalers/user/${userData.id}`);
        
        if (response.data) {
          console.log("Wholesaler data found:", response.data);
          setWholesalerInfo(response.data);
          
          // Set default delivery address
          setFormData(prev => ({
            ...prev,
            delivery_address: response.data.warehouseAddress || 
                             response.data.address || 
                             "Enter your warehouse address"
          }));
        } else {
          throw new Error("No wholesaler data returned");
        }
      } else {
        console.error("No user ID found in localStorage");
        setError("Please log in again to place orders");
      }
} catch (error) {
  console.error("Error fetching wholesaler info:", error);
  
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const fallbackWholesalerInfo = {
    id: userData.id || 'unknown',
    businessName: userData.businessName || userData.fullName || "Your Wholesaler Business",
    warehouseAddress: userData.businessAddress || "Please enter your warehouse address",
    role: 'wholesaler'
  };
  setWholesalerInfo(fallbackWholesalerInfo);
  setError("Please verify your warehouse address below before placing order.");
}
  };

  fetchWholesalerInfo();
}, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
// ✅ NEW SIMPLIFIED handleSubmit function:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ✅ ADD ID conflict validation at the start
  if (manufacturer.id === wholesalerInfo?.id) {
    setError("❌ Cannot place order: Manufacturer and Wholesaler cannot be the same company");
    return;
  }

  if (!product || !manufacturer || !wholesalerInfo) {
    setError("Missing required information");
    return;
  }

  if (formData.quantity < 1) {
    setError("Quantity must be at least 1");
    return;
  }
if (parseInt(formData.quantity) > parseInt(product.stock_qty)) {
  setError(`Only ${product.stock_qty} units available in stock`);
  return;
}

  if (!formData.delivery_address.trim()) {
    setError("Delivery address is required");
    return;
  }

  try {
    setLoading(true);
    setError("");
    
    const orderData = {
      order_id: orderId,
      manufacturer_id: manufacturer.id,
      wholesaler_id: wholesalerInfo.id,
      product_id: product.id,
      quantity: parseInt(formData.quantity),
      unit_price: parseFloat(product.unit_price),
      total_amount: parseFloat(orderDetails.totalAmount),
      gst_percentage: 18,
      gst_amount: parseFloat(orderDetails.gstAmount),
      payment_mode: formData.payment_mode,
      delivery_address: formData.delivery_address,
      preferred_delivery_date: formData.preferred_delivery_date || null,
      notes: formData.notes || "",
      status: "pending",
      order_date: new Date().toISOString(),
      product_name: product.name,
      manufacturer_name: manufacturer.businessName,
      wholesaler_name: wholesalerInfo.businessName,
      manufacturer_role: "manufacturer",
      wholesaler_role: "wholesaler"
    };

    console.log("Submitting order (pending approval):", orderData);

 // In your OrderFormSection
const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
if (response.data.success) {
  console.log('✅ Order placed, email sent, notification saved!');
}
    if (response.data && response.data.success) {
      setSuccess("Order placed successfully! Waiting for manufacturer approval. You'll be notified when it's processed.");
       // Emit Socket.io event to notify manufacturer
      if (window.socket) {
        window.socket.emit('new-order', {
          manufacturerId: manufacturer.id,
          orderId: orderId,
          wholesalerName: wholesalerInfo.businessName,
          productName: product.name,
          quantity: parseInt(formData.quantity),
          totalAmount: parseFloat(orderDetails.totalAmount),
          orderData: orderData
        });
        console.log("📤 Order notification sent to manufacturer:", manufacturer.id);
      }
      setTimeout(() => {
        if (onOrderSuccess) {
          onOrderSuccess();
        }
      }, 3000);
    } else {
      setError(response.data?.message || "Order submission failed");
    }
  } catch (error) {
    console.error("Error placing order:", error);
    setError(error.response?.data?.message || "Failed to place order. Please try again.");
  } finally {
    setLoading(false);
  }
};

  if (!product || !manufacturer) {
    return (
      <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8 border border-gray-700">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-lg mb-4">Product or manufacturer information is missing.</p>
        <button
          onClick={onBack}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg"
        >
          Back to Catalog
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-400 text-center mt-2">
          Complete the order form below
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 text-green-300">
          ✅ {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-300">
          ❌ {error}
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Form */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Order Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auto-generated Information Section */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-400" />
                  Order Details (Auto-generated)
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      Order ID:
                    </span>
                    <p className="text-white font-mono font-medium">{orderId}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Manufacturer ID:
                    </span>
                    <p className="text-white font-medium">{manufacturer.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Wholesaler ID:
                    </span>
                    <p className="text-white font-medium">{wholesalerInfo?.id || 'Loading...'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 flex items-center gap-2">
                      <Box className="w-3 h-3" />
                      Product ID:
                    </span>
                    <p className="text-white font-medium">{product.id}</p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Product Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Product Name:</span>
                    <p className="text-white font-medium">{product.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Manufacturer:</span>
                    <p className="text-white font-medium">{manufacturer.businessName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Available Stock:</span>
                    <p className="text-white font-medium">{product.stock_qty} units</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Unit Price:</span>
                    <p className="text-green-400 font-bold">${parseFloat(product.unit_price).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Quantity Required */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Package className="w-4 h-4 inline mr-2" />
                  Quantity Required *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max={product.stock_qty}
                  required
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Maximum available: {product.stock_qty} units
                </p>
              </div>

              {/* Price Information (Auto-calculated) */}
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  Price Details (Auto-calculated)
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Unit Price:</span>
                    <p className="text-white">${orderDetails.unitPrice}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Quantity:</span>
                    <p className="text-white">{orderDetails.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Subtotal:</span>
                    <p className="text-white">${orderDetails.subtotal}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">GST (18%):</span>
                    <p className="text-yellow-400">${orderDetails.gstAmount}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-purple-500/20">
                    <span className="text-gray-400 font-semibold">Total Amount:</span>
                    <p className="text-green-400 font-bold text-lg">${orderDetails.totalAmount}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Home className="w-4 h-4 inline mr-2" />
                  Delivery Address (Wholesaler's Warehouse) *
                </label>
                <textarea
                  name="delivery_address"
                  value={formData.delivery_address}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Enter your warehouse delivery address..."
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {["online", "cash", "credit"].map((mode) => (
                    <label
                      key={mode}
                      className={cn(
                        "border-2 rounded-lg p-4 text-center cursor-pointer transition-all",
                        formData.payment_mode === mode
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-gray-600 bg-gray-700 hover:border-gray-500"
                      )}
                    >
                      <input
                        type="radio"
                        name="payment_mode"
                        value={mode}
                        checked={formData.payment_mode === mode}
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <span className="text-white font-medium capitalize">
                        {mode}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
{/* Preferred Delivery Date */}
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    <Calendar className="w-4 h-4 inline mr-2" />
    Preferred Delivery Date
  </label>
  <input
    type="date"
    name="preferred_delivery_date"
    value={formData.preferred_delivery_date}
    onChange={handleInputChange}
    min={getMinDeliveryDate()}
    className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  />
  <p className="text-xs text-gray-400 mt-1">
    Automatically set to 5 days from today for standard delivery
  </p>
</div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any special instructions or notes for the manufacturer..."
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2",
                  loading
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                )}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Place Order & Notify Manufacturer
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Order Summary
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-white font-mono text-sm">{orderId}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Product:</span>
                <span className="text-white text-right text-sm">{product.name}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Manufacturer:</span>
                <span className="text-white text-right text-sm">{manufacturer.businessName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-700 pb-4">
                <span className="text-gray-400">Quantity:</span>
                <span className="text-white">{orderDetails.quantity}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Unit Price:</span>
                <span className="text-white">${orderDetails.unitPrice}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">${orderDetails.subtotal}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">GST (18%):</span>
                <span className="text-yellow-400">${orderDetails.gstAmount}</span>
              </div>

              <div className="flex justify-between items-center py-4 border-t border-gray-700 pt-4">
                <span className="text-lg font-bold text-white">Total Amount:</span>
                <span className="text-2xl font-bold text-green-400">
                  ${orderDetails.totalAmount}
                </span>
              </div>
            </div>

{/* Order Status */}
<div className="mt-6 pt-6 border-t border-gray-700">
  <h3 className="font-semibold text-white mb-3">Order Status</h3>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-gray-400">Payment Mode:</span>
      <span className="text-white capitalize">{formData.payment_mode}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-400">Status:</span>
      <span className="text-yellow-400 font-medium">⏳ Pending Approval</span>
    </div>
    {formData.preferred_delivery_date && (
      <div className="flex justify-between">
        <span className="text-gray-400">Preferred Delivery:</span>
        <span className="text-white text-sm">
          {new Date(formData.preferred_delivery_date).toLocaleDateString()}
        </span>
      </div>
    )}
  </div>
</div>

{/* Manufacturer Notification */}
<div className="mt-6 pt-6 border-t border-gray-700">
  <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
    <h4 className="font-semibold text-yellow-400 text-sm mb-1">Awaiting Manufacturer Approval</h4>
    <p className="text-yellow-300 text-xs">
      Your order is pending approval from the manufacturer. 
      You'll receive an email with the invoice once approved.
    </p>
  </div>
</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main WholesalerCatalog Component
const WholesalerCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("manufacturers"); // "manufacturers", "products", "product-details", "order-form"
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  // Fetch all verified manufacturers - FIXED API CALL
  const fetchManufacturers = async () => {
    try {
      setLoading(true);
      setApiError("");
      console.log("Fetching manufacturers from:", `${API_BASE_URL}/companies`);
      
      const res = await axios.get(`${API_BASE_URL}/companies`);
      if (res.data && Array.isArray(res.data)) {
        setManufacturers(res.data);
      } else {
        console.error("Invalid response format:", res.data);
        setManufacturers([]);
      }
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      setApiError("Failed to load manufacturers. Using demo data.");
      // Demo data as fallback
      setManufacturers([
        {
          id: 1,
          businessName: "PharmaCorp Ltd",
          state: "California",
          country: "USA",
          panGstNumber: "GST123456789"
        },
        {
          id: 2,
          businessName: "MediLife Solutions",
          state: "Texas",
          country: "USA", 
          panGstNumber: "GST987654321"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for a specific manufacturer - FIXED API CALL
  const fetchManufacturerProducts = async (companyName) => {
    try {
      setLoading(true);
      console.log("Fetching products for company:", companyName);
      const res = await axios.get(`${API_BASE_URL}/medicines/company/${encodeURIComponent(companyName)}`);
      if (res.data && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
      setView("products");
    } catch (error) {
      console.error("Error fetching manufacturer products:", error);
      // Demo products as fallback
      setProducts([
        {
          id: 1,
          name: "Paracetamol 500mg",
          description: "Pain reliever and fever reducer",
          unit_price: "15.99",
          stock_qty: 100,
          image: null,
          sku: "PARA500",
          expiry_date: "2025-12-31",
          category: "Pain Relief"
        },
        {
          id: 2, 
          name: "Vitamin C 1000mg",
          description: "Immune system support",
          unit_price: "25.50",
          stock_qty: 50,
          image: null,
          sku: "VITC1000",
          expiry_date: "2025-06-30",
          category: "Vitamins"
        }
      ]);
      setView("products");
    } finally {
      setLoading(false);
    }
  };

  // Handle manufacturer card click
  const handleManufacturerClick = (manufacturer) => {
    setSelectedManufacturer(manufacturer);
    fetchManufacturerProducts(manufacturer.businessName);
  };

  // Handle product image click
  const handleProductDetailsClick = (product) => {
    setSelectedProduct(product);
    setView("product-details");
  };

  // Handle back to manufacturers list
  const handleBackToManufacturers = () => {
    setSelectedManufacturer(null);
    setProducts([]);
    setView("manufacturers");
  };

  // Handle back to products list
  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setView("products");
  };

  // Handle place order click
  const handlePlaceOrder = (product) => {
    setSelectedProduct(product);
    setView("order-form");
  };

  // Handle order success
  const handleOrderSuccess = () => {
    // Redirect to orders page
    navigate('/wholesaler/orders');
  };

  // Filter manufacturers based on search
  const filteredManufacturers = manufacturers.filter(manufacturer => {
    if (!manufacturer) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const businessName = manufacturer.businessName || '';
    const state = manufacturer.state || '';
    const country = manufacturer.country || '';
    const panGst = manufacturer.panGstNumber || '';
    
    return (
      businessName.toLowerCase().includes(searchLower) ||
      state.toLowerCase().includes(searchLower) ||
      country.toLowerCase().includes(searchLower) ||
      panGst.toLowerCase().includes(searchLower)
    );
  });

  // Load manufacturers on component mount
  useEffect(() => {
    fetchManufacturers();
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 bg-gray-900 min-h-full">
          {/* Header Section */}
          <div className="mb-8">
            {view === "manufacturers" && (
              <>
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                  🏭 Manufacturer Directory
                </h1>
                <p className="text-gray-400 text-center mb-6">
                  Browse verified pharmaceutical manufacturers and their product catalogs
                </p>
                
                {/* API Error Message */}
                {apiError && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4 text-yellow-300 text-center">
                    ⚠️ {apiError}
                  </div>
                )}
                
                <div className="flex justify-center items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by company name, state, country, or PAN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-600 bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 w-96 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                </div>
              </>
            )}

            {view === "products" && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToManufacturers}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  <ArrowLeft size={20} />
                  Back to Manufacturers
                </button>
                <h1 className="text-2xl font-bold text-white text-center flex-1">
                  {selectedManufacturer?.businessName}'s Products
                </h1>
                <div className="w-6"></div>
              </div>
            )}

            {view === "product-details" && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToProducts}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  <ArrowLeft size={20} />
                  Back to Products
                </button>
                <h1 className="text-2xl font-bold text-white text-center flex-1">
                  Product Details
                </h1>
                <div className="w-6"></div>
              </div>
            )}

            {view === "order-form" && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setView("product-details")}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  <ArrowLeft size={20} />
                  Back to Product
                </button>
                <h1 className="text-3xl font-bold text-white text-center flex-1">
                  Place Order
                </h1>
                <div className="w-6"></div>
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center text-gray-400 mb-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="mt-2">
                {view === "manufacturers" ? "Loading manufacturers..." : 
                 view === "products" ? "Loading products..." : 
                 view === "product-details" ? "Loading product details..." : 
                 "Processing..."}
              </p>
            </div>
          )}

          {/* Manufacturers Grid View */}
          {view === "manufacturers" && (
            <>
              {filteredManufacturers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredManufacturers.map((manufacturer, index) => (
                    <div
                      key={manufacturer.id || index}
                      onClick={() => handleManufacturerClick(manufacturer)}
                      className="bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-700 hover:border-purple-500 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    >
                      {/* Company Icon */}
                      <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-lg mb-4 mx-auto group-hover:bg-purple-700 transition-colors">
                        <Building className="w-8 h-8 text-white" />
                      </div>

                      {/* Company Name */}
                      <h2 className="text-xl font-semibold text-white text-center mb-3 line-clamp-2">
                        {manufacturer.businessName}
                      </h2>
                      
                      <div className="space-y-3">
                        {/* Location */}
                        <div className="flex items-center gap-2 text-gray-300 justify-center">
                          <MapPin size={16} className="text-purple-400" />
                          <span className="text-sm">
                            {manufacturer.state}, {manufacturer.country}
                          </span>
                        </div>

                        {/* PAN/GST Number */}
                        {manufacturer.panGstNumber && (
                          <div className="text-center">
                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                              PAN: {manufacturer.panGstNumber}
                            </span>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="pt-3 border-t border-gray-700">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-green-400 font-medium">Verified</span>
                            <span className="text-purple-400 group-hover:text-purple-300 transition-colors">
                              View Products →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loading && (
                  <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8 border border-gray-700">
                    <div className="text-4xl mb-4">🏭</div>
                    <p className="text-lg mb-2">
                      {searchTerm ? "No manufacturers found matching your search" : "No verified manufacturers available"}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-purple-400 hover:text-purple-300 mt-2"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )
              )}
            </>
          )}

          {/* Products Grid View */}
          {view === "products" && (
            <>
              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onViewDetails={handleProductDetailsClick}
                    />
                  ))}
                </div>
              ) : (
                !loading && (
                  <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8 border border-gray-700">
                    <div className="text-4xl mb-4">📦</div>
                    <p className="text-lg">
                      No products available from {selectedManufacturer?.businessName}
                    </p>
                    <button
                      onClick={handleBackToManufacturers}
                      className="text-purple-400 hover:text-purple-300 mt-4"
                    >
                      Back to manufacturers
                    </button>
                  </div>
                )
              )}
            </>
          )}

          {/* Product Details View */}
          {view === "product-details" && selectedProduct && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                  {/* Product Image */}
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md">
                      {getImageUrl(selectedProduct.image) ? (
                        <img
                          src={getImageUrl(selectedProduct.image)}
                          alt={selectedProduct.name}
                          className="w-full h-80 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-80 bg-gray-700 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <div className="text-6xl mb-4">💊</div>
                            <span className="text-lg">No Image Available</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2">
                        {selectedProduct.name}
                      </h1>
                      {selectedProduct.description && (
                        <p className="text-gray-300 text-lg">
                          {selectedProduct.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Price:</span>
                        <span className="text-2xl font-bold text-green-400">
                          ${parseFloat(selectedProduct.unit_price || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Available Stock:</span>
                        <span className={`text-lg font-semibold ${
                          selectedProduct.stock_qty > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {selectedProduct.stock_qty || 0} units
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">SKU/Batch:</span>
                        <span className="text-white font-medium">
                          {selectedProduct.sku || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Expiry Date:</span>
                        <span className="text-white font-medium">
                          {selectedProduct.expiry_date ? 
                            new Date(selectedProduct.expiry_date).toLocaleDateString() : 'N/A'
                          }
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Category:</span>
                        <span className="text-white font-medium">
                          {selectedProduct.category || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                      onClick={() => handlePlaceOrder(selectedProduct)}
                      disabled={!selectedProduct.stock_qty || selectedProduct.stock_qty <= 0}
                      className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
                        selectedProduct.stock_qty > 0
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {selectedProduct.stock_qty > 0 ? '🛒 Place Order' : 'Out of Stock'}
                    </button>

                    {selectedProduct.stock_qty <= 0 && (
                      <p className="text-red-400 text-center text-sm">
                        This product is currently out of stock
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Form View */}
          {view === "order-form" && selectedProduct && selectedManufacturer && (
            
            <OrderFormSection
              product={selectedProduct}
              manufacturer={selectedManufacturer}
              onBack={() => setView("product-details")}
              onOrderSuccess={handleOrderSuccess}
            />
          )}

          {/* Stats Footer */}
          {view === "manufacturers" && filteredManufacturers.length > 0 && (
            <div className="mt-8 text-center text-gray-500 text-sm">
              Showing {filteredManufacturers.length} verified manufacturer(s)
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WholesalerCatalog;