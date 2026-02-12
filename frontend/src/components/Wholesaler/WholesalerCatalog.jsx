import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api/apiconfig";
import { io } from "socket.io-client"; 
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  FileText, 
  Mail, 
  Bell,
  Ship, 
  Zap, 
    Edit3,
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
  Home,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Tag,
  BarChart,
  Shield,
  Info,
  ExternalLink
} from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Helper function for image URLs
const getImageUrl = (imagePath) => {
  if (!imagePath || imagePath === 'No image' || imagePath === 'NULL') return null;
  
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('blob:')) return imagePath;
  if (imagePath.startsWith('/')) {
    return `http://localhost:8080${imagePath}`;
  }
  return `http://localhost:8080/uploads/${imagePath}`;
};

// Cart Context
const CartContext = React.createContext();

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { 
              ...item, 
              quantity: item.quantity + quantity,
              unit_price: parseFloat(product.unit_price) || 0
            }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity: quantity,
        unit_price: parseFloat(product.unit_price) || 0,
        cartId: `${product.id}-${Date.now()}`,
        product_name: product.name,
        product_id: product.id,
        manufacturer_id: product.company_id
      }]);
    }
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateCartQuantity = (cartId, quantity) => {
    if (quantity < 1) {
      removeFromCart(cartId);
      return;
    }
    setCart(cart.map(item => 
      item.cartId === cartId ? { ...item, quantity: quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedManufacturer(null);
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      const unitPrice = typeof item.unit_price === 'number' 
        ? item.unit_price 
        : parseFloat(item.unit_price) || 0;
      return sum + (unitPrice * item.quantity);
    }, 0);
    
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    
    return { 
      subtotal: parseFloat(subtotal.toFixed(2)), 
      gst: parseFloat(gst.toFixed(2)), 
      total: parseFloat(total.toFixed(2)), 
      items: cart.length,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  };

  return (
    <CartContext.Provider value={{
      cart,
      selectedManufacturer,
      setSelectedManufacturer,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      getCartTotals
    }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
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

// Also update the ProductDetailsModal with similar editable quantity
const ProductDetailsModal = ({ product, onClose, onAddToCart }) => {
  const { addToCart, selectedManufacturer } = useCart();
  const [quantity, setQuantity] = useState(200);
  const [addingToCart, setAddingToCart] = useState(false);
  const [added, setAdded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState("200");
  const imageUrl = getImageUrl(product.image);

  const validateAndAddToCart = async () => {
    if (!selectedManufacturer) {
      alert("Please select a manufacturer first!");
      return;
    }
    
    const qty = parseInt(quantity);
    
    if (qty < 200) {
      alert(`Minimum order quantity is 200 units! You entered ${qty}.`);
      return;
    }
    
    if (qty > product.stock_qty) {
      alert(`Only ${product.stock_qty} units available!`);
      return;
    }
    
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity (minimum 200 units)");
      return;
    }
    
    setAddingToCart(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addToCart(product, qty);
    setQuantity(200);
    setTempQuantity("200");
    
    setAddingToCart(false);
    setAdded(true);
    
    setTimeout(() => {
      setAdded(false);
      if (onAddToCart) onAddToCart();
    }, 2000);
  };

  const handleQuantityEdit = () => {
    setEditingQuantity(true);
    setTempQuantity(quantity.toString());
  };

  const saveQuantity = () => {
    const newQty = parseInt(tempQuantity);
    
    if (isNaN(newQty) || newQty < 200) {
      alert("Minimum order quantity is 200 units!");
      setTempQuantity(quantity.toString());
      setEditingQuantity(false);
      return;
    }
    
    if (newQty > product.stock_qty) {
      alert(`Only ${product.stock_qty} units available!`);
      setTempQuantity(quantity.toString());
      setEditingQuantity(false);
      return;
    }
    
    setQuantity(newQty);
    setEditingQuantity(false);
  };

  const handleQuantityInputChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setTempQuantity(value);
    }
  };

  const handleQuantityKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveQuantity();
    } else if (e.key === 'Escape') {
      setEditingQuantity(false);
      setTempQuantity(quantity.toString());
    }
  };


  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Product Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Image */}
            <div>
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-gray-700 rounded-lg">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">💊</div>
                      <span>No Image Available</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-green-400 font-bold text-2xl">
                    ${parseFloat(product.unit_price || 0).toFixed(2)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    product.stock_qty > 0 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Description</h3>
                  <p className="text-gray-400 bg-gray-800 rounded-lg p-4">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Product Details Table - UPDATED */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-gray-300 font-medium mb-3">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Manufacturer */}
                  <div>
                    <label className="text-gray-400 text-sm">Manufacturer</label>
                    <p className="text-white">{product.businessName || product.company_name || "N/A"}</p>
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label className="text-gray-400 text-sm">Category</label>
                    <p className="text-white">{product.category || "N/A"}</p>
                  </div>
                  
                  
                  
                  {/* Manufacturing Date */}
                  <div>
                    <label className="text-gray-400 text-sm">Manufacturing Date</label>
                    <p className="text-white">
                      {product.mfg_date 
                        ? new Date(product.mfg_date).toLocaleDateString() 
                        : "N/A"}
                    </p>
                  </div>
                  
                  {/* Expiry Date */}
                  <div>
                    <label className="text-gray-400 text-sm">Expiry Date</label>
                    <p className="text-white">
                      {product.expiry_date 
                        ? new Date(product.expiry_date).toLocaleDateString() 
                        : "N/A"}
                    </p>
                  </div>
                  
                  {/* GST Percentage */}
                  <div>
                    <label className="text-gray-400 text-sm">GST Percentage</label>
                    <p className="text-white">{product.gst_percentage || "18"}%</p>
                  </div>
                  
                  {/* Salt Name */}
                  {product.salt_name && (
                    <div>
                      <label className="text-gray-400 text-sm">Salt Name</label>
                      <p className="text-white">{product.salt_name}</p>
                    </div>
                  )}
                  
                  {/* Dosage (if available) */}
                  {product.dosage && (
                    <div>
                      <label className="text-gray-400 text-sm">Dosage</label>
                      <p className="text-white">{product.dosage}</p>
                    </div>
                  )}
                </div>
                
                {/* Additional Information Row (if needed) */}
                {(product.packaging || product.storage_conditions) && (
                  <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                    {product.packaging && (
                      <div>
                        <label className="text-gray-400 text-sm">Packaging</label>
                        <p className="text-white">{product.packaging}</p>
                      </div>
                    )}
                    {product.storage_conditions && (
                      <div>
                        <label className="text-gray-400 text-sm">Storage Conditions</label>
                        <p className="text-white">{product.storage_conditions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity Selector and Add to Cart */}
              <div className="bg-gray-800 rounded-lg p-4">
      <div className="space-y-4">
        {/* Quantity Selector */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-300 font-medium">Quantity</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-yellow-400">Min: 200 units</span>
              {quantity < 200 && (
                <span className="text-red-400 text-sm">❌</span>
              )}
            </div>
          </div>
          
          {editingQuantity ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={tempQuantity}
                onChange={handleQuantityInputChange}
                onKeyDown={handleQuantityKeyPress}
                onBlur={saveQuantity}
                className="flex-1 bg-gray-700 border-2 border-purple-500 rounded-lg px-4 py-3 text-white text-center text-lg"
                autoFocus
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={saveQuantity}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
                  title="Save"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setEditingQuantity(false);
                    setTempQuantity(quantity.toString());
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg"
                  title="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleQuantityEdit}
              className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white text-2xl font-bold">
                    {quantity} units
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Click to edit quantity
                  </div>
                </div>
                <Edit3 size={20} className="text-purple-400" />
              </div>
            </div>
          )}
          
          {/* Quick adjustment buttons */}
          {!editingQuantity && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setQuantity(prev => Math.max(200, prev - 100))}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                -100
              </button>
              <button
                onClick={() => setQuantity(prev => Math.min(product.stock_qty, prev + 100))}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                +100
              </button>
            </div>
          )}
        </div>
        
        {/* Add to Cart Button */}
        <button
          onClick={validateAndAddToCart}
          disabled={!selectedManufacturer || product.stock_qty < 200 || quantity < 200 || addingToCart || added}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            !selectedManufacturer
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : quantity < 200
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : addingToCart
                  ? 'bg-blue-700 cursor-wait'
                  : added
                    ? 'bg-green-600'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {!selectedManufacturer ? (
            'Select Manufacturer First'
          ) : product.stock_qty < 200 ? (
            'Insufficient Stock'
          ) : quantity < 200 ? (
            <>
              <AlertCircle size={20} />
              Minimum 200 Units Required
            </>
          ) : addingToCart ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding to Cart...
            </>
          ) : added ? (
            <>
              <Check size={20} className="animate-bounce" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingCart size={20} />
              Add to Cart ({quantity} units)
            </>
          )}
        </button>
      </div>
    </div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
// Product Card Component - FIXED VERSION
// Product Card Component - UPDATED with editable quantity and min 200 validation
const ProductCard = ({ product, onViewDetails }) => {
  const imageUrl = getImageUrl(product.image);
  const { addToCart, selectedManufacturer } = useCart();
  const [quantity, setQuantity] = useState(200); // Start with minimum 200
  const [addingToCart, setAddingToCart] = useState(false);
  const [added, setAdded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState("200");

  // Check if product is out of stock
  const isOutOfStock = (product.stock_qty || 0) <= 0;

  // Don't render out of stock products
  if (isOutOfStock) {
    return null;
  }

  // Validate quantity before adding to cart
  const validateAndAddToCart = async () => {
    if (!selectedManufacturer) {
      alert("Please select a manufacturer first!");
      return;
    }
    
    // Convert to number and validate
    const qty = parseInt(quantity);
    
    // Minimum 200 validation
    if (qty < 200) {
      alert(`Minimum order quantity is 200 units! You entered ${qty}.`);
      return;
    }
    
    // Stock validation
    if (qty > product.stock_qty) {
      alert(`Only ${product.stock_qty} units available!`);
      return;
    }
    
    // Check if quantity is a valid number
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity (minimum 200 units)");
      return;
    }
    
    // Show loading/click feedback
    setAddingToCart(true);
    
    // Simulate a short delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addToCart(product, qty);
    setQuantity(200); // Reset to minimum
    setTempQuantity("200");
    
    // Show success feedback
    setAddingToCart(false);
    setAdded(true);
    
    // Reset success feedback after 2 seconds
    setTimeout(() => setAdded(false), 2000);
  };

  // Handle quantity edit
  const handleQuantityEdit = () => {
    setEditingQuantity(true);
    setTempQuantity(quantity.toString());
  };

  // Save edited quantity
  const saveQuantity = () => {
    const newQty = parseInt(tempQuantity);
    
    if (isNaN(newQty) || newQty < 200) {
      alert("Minimum order quantity is 200 units!");
      setTempQuantity(quantity.toString());
      setEditingQuantity(false);
      return;
    }
    
    if (newQty > product.stock_qty) {
      alert(`Only ${product.stock_qty} units available!`);
      setTempQuantity(quantity.toString());
      setEditingQuantity(false);
      return;
    }
    
    setQuantity(newQty);
    setEditingQuantity(false);
  };

  // Handle input change
  const handleQuantityInputChange = (e) => {
    const value = e.target.value;
    // Allow only numbers
    if (/^\d*$/.test(value)) {
      setTempQuantity(value);
    }
  };

  // Handle input key press
  const handleQuantityKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveQuantity();
    } else if (e.key === 'Escape') {
      setEditingQuantity(false);
      setTempQuantity(quantity.toString());
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 overflow-hidden">
      {/* Image Section */}
      <div 
        className="relative h-48 bg-gray-700 cursor-pointer group"
        onClick={() => onViewDetails(product)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-green-400 font-bold text-lg">
            ${parseFloat(product.unit_price || 0).toFixed(2)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            {product.stock_qty} in stock
          </span>
        </div>

        {/* Quantity Selector and Add to Cart - UPDATED */}
        <div className="space-y-3">
          {/* Quantity Selector */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-300 text-sm font-medium">
                Quantity (Min: 200)
              </label>
              {quantity < 200 && (
                <span className="text-red-400 text-xs">
                  ❌ Min 200 required
                </span>
              )}
            </div>
            
            {editingQuantity ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempQuantity}
                  onChange={handleQuantityInputChange}
                  onKeyDown={handleQuantityKeyPress}
                  onBlur={saveQuantity}
                  className="flex-1 bg-gray-600 border border-purple-500 rounded px-3 py-2 text-white text-center"
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={saveQuantity}
                    className="bg-green-600 hover:bg-green-700 text-white p-1 rounded"
                    title="Save"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingQuantity(false);
                      setTempQuantity(quantity.toString());
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded"
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleQuantityEdit}
                className="flex items-center justify-between bg-gray-600 rounded-lg p-2 cursor-pointer hover:bg-gray-500 transition-colors group"
                title="Click to edit quantity"
              >
                <div className="text-white font-medium">
                  {quantity} units
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                  </div>
                  <Edit3 size={14} className="text-gray-400" />
                </div>
              </div>
            )}
            
            {/* Quick action buttons */}
            {!editingQuantity && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    const newQty = Math.max(200, quantity - 100);
                    setQuantity(newQty);
                  }}
                  className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 rounded"
                >
                  -100
                </button>
                <button
                  onClick={() => {
                    const newQty = Math.min(product.stock_qty, quantity + 100);
                    setQuantity(newQty);
                  }}
                  className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 rounded"
                >
                  +100
                </button>
              </div>
            )}
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={validateAndAddToCart}
            disabled={!selectedManufacturer || product.stock_qty < 200 || addingToCart || added}
            className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              !selectedManufacturer || product.stock_qty < 200
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : quantity < 200
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : addingToCart
                    ? 'bg-blue-700 cursor-wait'
                    : added
                      ? 'bg-green-600'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {!selectedManufacturer ? (
              'Select Manufacturer First'
            ) : product.stock_qty < 200 ? (
              'Insufficient Stock'
            ) : quantity < 200 ? (
              <>
                <AlertCircle size={16} />
                Min 200 Units Required
              </>
            ) : addingToCart ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </>
            ) : added ? (
              <>
                <Check size={16} className="animate-bounce" />
                Added!
              </>
            ) : (
              'Add to Cart'
            )}
          </button>
          
          {/* Stock Warning */}
          {product.stock_qty < 200 && (
            <div className="text-red-400 text-xs text-center mt-1">
              Minimum order requirement not met (available: {product.stock_qty})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CartSidebar = ({ isOpen, onClose, onPlaceOrder }) => {
  const { 
    cart, 
    selectedManufacturer, 
    removeFromCart, 
    updateCartQuantity,
    clearCart,
    getCartTotals 
  } = useCart();
  
  const totals = getCartTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-gray-900 h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Shopping Cart</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {selectedManufacturer && (
            <div className="mt-2 text-sm text-gray-300">
              Ordering from: <span className="text-purple-400">{selectedManufacturer.businessName}</span>
            </div>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Your cart is empty</p>
            <p className="text-gray-500 text-sm mt-1">
              Add medicines from the catalog
            </p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="p-4 space-y-4">
              {cart.map(item => (
                <div key={item.cartId} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{item.name}</h4>
                      <p className="text-gray-400 text-sm mb-2">
                        ${(item.unit_price || 0).toFixed(2)} each
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-white font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${((item.unit_price || 0) * item.quantity).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.cartId)}
                            className="text-red-400 hover:text-red-300 text-sm mt-1"
                          >
                            <Trash2 size={14} className="inline mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="p-4 border-t border-gray-800">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST (18%)</span>
                  <span>${totals.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-700">
                  <span>Total</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => {
                  onClose();
                  onPlaceOrder();
                }}
                disabled={!selectedManufacturer}
                className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  !selectedManufacturer
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <CheckCircle size={18} />
                Proceed to Order Summary ({cart.length} items)
              </button>
              
              {!selectedManufacturer && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  Please select a manufacturer first
                </p>
              )}
              
              <button
                onClick={onClose}
                className="w-full mt-3 py-2 text-gray-300 hover:text-white"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// OrderSummary Component - Updated with 3-day default delivery date
const OrderSummary = ({ onBack, onSubmit }) => {
  const navigate = useNavigate();
  const { cart, selectedManufacturer, clearCart, getCartTotals } = useCart();
  const [loading, setLoading] = useState(false);
  const [wholesalerInfo, setWholesalerInfo] = useState(null);
  const [gstPercent, setGstPercent] = useState(18);
  const [isEditingGST, setIsEditingGST] = useState(false);
  
  // Calculate 3 days from now for default delivery date
  const getDefaultDeliveryDate = () => {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    // Format to YYYY-MM-DD for input[type="date"]
    return threeDaysLater.toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    payment_mode: "online",
    delivery_address: "",
    preferred_delivery_date: getDefaultDeliveryDate(), // Set default to 3 days from now
    notes: ""
  });

  const totals = getCartTotals();

  // Auto-generate order ID
  const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  useEffect(() => {
    // Fetch wholesaler info for auto-filling address
    const fetchWholesalerInfo = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.id) {
          console.log('🔍 Fetching wholesaler info for user:', userData.id);
          const response = await axios.get(`${API_BASE_URL}/wholesalers/user/${userData.id}`);
          
          if (response.data) {
            console.log('✅ Wholesaler info received:', response.data);
            setWholesalerInfo(response.data);
            
            // Auto-fill delivery address from backend
            setFormData(prev => ({
              ...prev,
              delivery_address: response.data.warehouseAddress || response.data.businessAddress || ""
            }));
          }
        }
      } catch (error) {
        console.error("❌ Error fetching wholesaler info:", error);
        alert("Could not fetch your warehouse address. Please enter it manually.");
      }
    };
    
    fetchWholesalerInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if (!userData.id) {
        alert('Please log in again');
        return;
      }

      if (!selectedManufacturer || !selectedManufacturer.id) {
        alert('Please select a manufacturer first');
        return;
      }

      // Calculate totals using the correct GST percentage
      const subtotal = cart.reduce((sum, item) => {
        const unitPrice = parseFloat(item.unit_price) || 0;
        return sum + (item.quantity * unitPrice);
      }, 0);
      
      const gst_amount = subtotal * (gstPercent / 100);
      const total_amount = subtotal + gst_amount;

      // Prepare items matching your order_items table schema
      const items = cart.map(item => ({
        product_id: item.id,
        medicine_name: item.name || item.product_name,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        gst_percentage: gstPercent, // Use the editable GST percentage
        discount_percentage: 0.00
      }));

      const orderData = {
        wholesaler_id: parseInt(userData.id),
        manufacturer_id: parseInt(selectedManufacturer.id),
        items: items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        gst_amount: parseFloat(gst_amount.toFixed(2)),
        total_amount: parseFloat(total_amount.toFixed(2)),
        delivery_address: formData.delivery_address.trim(),
        payment_mode: formData.payment_mode,
        preferred_delivery_date: formData.preferred_delivery_date || null,
        notes: formData.notes || "",
        payment_status: 'pending'
      };

      console.log('📤 Sending order data:', JSON.stringify(orderData, null, 2));
      console.log('🔍 Manufacturer ID:', selectedManufacturer.id);
      console.log('🔍 Wholesaler ID:', userData.id);

      const response = await axios.post(`${API_BASE_URL}/orders/multi`, orderData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Order response:', response.data);
      
      if (response.data.success) {
        alert(`✅ Order placed successfully! Order ID: ${response.data.order.order_id}`);
        clearCart();
        navigate('/wholesaler/orders');
      } else {
        throw new Error(response.data.message || 'Order failed');
      }

    } catch (error) {
      console.error('❌ Order submission error:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      
      let errorMessage = 'Failed to place order. ';
      if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate min date (today) and default date (3 days from now)
  const today = new Date().toISOString().split('T')[0];
  const threeDaysFromNow = getDefaultDeliveryDate();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Order Summary</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Form - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information Card */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Order Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auto-generated Fields */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Order ID</label>
                  <div className="bg-gray-700 text-white p-3 rounded-lg font-mono">
                    {orderId}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Manufacturer ID</label>
                  <div className="bg-gray-700 text-white p-3 rounded-lg">
                    {selectedManufacturer?.id || "Auto"}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Wholesaler ID</label>
                  <div className="bg-gray-700 text-white p-3 rounded-lg">
                    {JSON.parse(localStorage.getItem('userData') || '{}').id || "Auto"}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Delivery Date</label>
                  <div className="bg-gray-700 text-white p-3 rounded-lg">
                    {formData.preferred_delivery_date || threeDaysFromNow}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-300 font-medium">
                    Delivery Address *
                  </label>
                  {wholesalerInfo?.warehouseAddress && (
                    <span className="text-xs text-purple-400">
                      Auto-filled from your warehouse address
                    </span>
                  )}
                </div>
                <textarea
                  value={formData.delivery_address}
                  onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                  required
                  rows="3"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                  placeholder="Enter warehouse address for delivery"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Payment Mode *
                </label>
                <select
                  value={formData.payment_mode}
                  onChange={e => setFormData({...formData, payment_mode: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                >
                  <option value="online">Online Payment</option>
                  <option value="cash">Cash on Delivery</option>
                  <option value="credit">Credit Terms</option>
                </select>
              </div>

              {/* Delivery Date */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-300 font-medium">
                    Preferred Delivery Date *
                  </label>
                  <span className="text-xs text-green-400">
                    Default: 3 days from today
                  </span>
                </div>
                <input
                  type="date"
                  value={formData.preferred_delivery_date}
                  onChange={e => setFormData({...formData, preferred_delivery_date: e.target.value})}
                  min={today}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Minimum delivery date is today. Default is 3 days from now for processing.
                </p>
              </div>

              {/* GST Percentage (Editable) */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  GST Percentage *
                </label>
                {!isEditingGST ? (
                  <div
                    className="w-full bg-gray-700 text-white p-3 rounded-lg cursor-pointer border border-gray-600 hover:border-purple-500 transition-colors"
                    onDoubleClick={() => setIsEditingGST(true)}
                    title="Double click to edit GST percentage"
                  >
                    {gstPercent}% (Double click to edit)
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    onBlur={() => setIsEditingGST(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingGST(false);
                    }}
                    className="w-full bg-gray-700 border border-purple-500 rounded-lg p-3 text-white"
                    autoFocus
                  />
                )}
                <p className="text-gray-400 text-xs mt-1">
                  Double click the GST field to edit. Default is 18%
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                  placeholder="Any special instructions, delivery time preferences, etc..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                  loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                } text-white flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Order...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Place Order ({cart.length} items)
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Order Details - Right Column */}
        <div className="lg:col-span-1">
          {/* Manufacturer Info */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-bold mb-4">Manufacturer Information</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <Building size={24} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedManufacturer?.businessName}</p>
                <p className="text-gray-400 text-sm">
                  {selectedManufacturer?.state}, {selectedManufacturer?.country}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  ID: {selectedManufacturer?.id}
                </p>
              </div>
            </div>
          </div>

          {/* Wholesaler Info */}
          {wholesalerInfo && (
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold mb-4">Your Information</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{wholesalerInfo.businessName}</p>
                  <p className="text-gray-400 text-sm">
                    {wholesalerInfo.state}, {wholesalerInfo.country}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    ID: {wholesalerInfo.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Info Card */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-bold mb-4">Delivery Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Calendar size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Preferred Delivery Date</p>
                  <p className="text-white font-medium">
                    {formData.preferred_delivery_date || threeDaysFromNow}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Truck size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Estimated Arrival</p>
                  <p className="text-white font-medium">
                    {formData.preferred_delivery_date 
                      ? `On or before ${formData.preferred_delivery_date}`
                      : `Within 3-5 business days`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-bold mb-4">Order Items ({cart.length})</h3>
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.cartId} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.name}</p>
                    <div className="text-gray-400 text-sm">
                      Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Product ID: {item.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${((item.unit_price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Price Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GST ({gstPercent}%)</span>
                <span className="text-yellow-400">
                  ${(totals.subtotal * (gstPercent / 100)).toFixed(2)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-green-400 font-bold text-xl">
                    ${(totals.subtotal + (totals.subtotal * (gstPercent / 100))).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// RealTimeNotifications Component
const RealTimeNotifications = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('orderUpdate', (data) => {
        addNotification({
          type: 'order',
          title: `Order ${data.status}`,
          message: data.message || `Order ${data.orderId} is now ${data.status}`,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('invoiceNotification', (data) => {
        addNotification({
          type: 'invoice',
          title: 'Invoice Created',
          message: `Invoice #${data.invoiceNumber} for $${data.amount}`,
          timestamp: new Date().toISOString()
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('orderUpdate');
        socket.off('invoiceNotification');
      }
    };
  }, [socket]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notif, index) => (
                <div
                  key={index}
                  className={`p-4 border-b border-gray-700 ${
                    notif.type === 'order' ? 'bg-gray-800/50' : 'bg-purple-900/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      notif.type === 'order' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {notif.type === 'order' ? (
                        <Package size={16} className="text-blue-400" />
                      ) : (
                        <FileText size={16} className="text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{notif.title}</h4>
                      <p className="text-gray-300 text-sm mt-1">{notif.message}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main WholesalerCatalog Component
const WholesalerCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("manufacturers");
  const [showCart, setShowCart] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const { 
    cart, 
    selectedManufacturer, 
    setSelectedManufacturer,
    clearCart,
    getCartTotals 
  } = useCart();

  // In WholesalerCatalog.jsx - Fix the socket initialization
  useEffect(() => {
    if (socketRef.current) return;
    
    console.log('🔌 Initializing Socket.IO connection...');
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.id) {
      console.log('⚠️ No user data found, skipping socket connection');
      return;
    }
    
    const socket = io('http://localhost:8080', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setSocketConnected(true);
      
      // Join room based on user role
      if (userData.role === 'wholesaler') {
        socket.emit('join-wholesaler', userData.id);
        console.log(`👤 Joined wholesaler room: ${userData.id}`);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setSocketConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO server');
      setSocketConnected(false);
    });

    socket.on('newOrder', (data) => {
      console.log('📦 New order notification received:', data);
      // Show notification in UI
      alert(`📦 New Order: Order ${data.orderId} received from wholesaler`);
    });

    socket.on('orderUpdate', (data) => {
      console.log('🔄 Order update received:', data);
      // Show notification in UI
      alert(`🔄 Order Update: Order ${data.orderId} is now ${data.status}`);
    });

    // Test event handler
    socket.on('test', (data) => {
      console.log('🧪 Test event from server:', data);
    });

    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Fetch manufacturers
  const fetchManufacturers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/companies`);
      if (res.data && Array.isArray(res.data)) {
        setManufacturers(res.data);
      }
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for manufacturer
// Fetch products for manufacturer - WITH DEBUGGING
const fetchManufacturerProducts = async (companyName) => {
  try {
    setLoading(true);
    console.log(`📡 Fetching products for company: ${companyName}`);
    
    const res = await axios.get(`${API_BASE_URL}/medicines/company/${encodeURIComponent(companyName)}`);
    
    console.log('📦 Full API Response:', res);
    console.log('📦 Response data:', res.data);
    console.log('📦 Is array?', Array.isArray(res.data));
    
    if (res.data && Array.isArray(res.data)) {
      console.log(`✅ Received ${res.data.length} products`);
      
      // Check first few products
      res.data.slice(0, 3).forEach((product, i) => {
        console.log(`   Product ${i+1}:`, {
          id: product.id,
          name: product.name,
          stock_qty: product.stock_qty,
          price: product.unit_price
        });
      });
      
      setProducts(res.data);
    } else {
      console.warn('⚠️ Response is not an array');
      setProducts([]);
    }
    
    setView("products");
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    console.error("❌ Error response:", error.response?.data);
    setProducts([]);
    setView("products");
  } finally {
    setLoading(false);
  }
};
  // Handle manufacturer selection
  const handleManufacturerClick = (manufacturer) => {
    setSelectedManufacturer(manufacturer);
    fetchManufacturerProducts(manufacturer.businessName);
  };

  // Handle view product details
  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  // Handle place order from cart
  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowCart(false);
    setView("order-summary");
  };

  // Handle order success
  const handleOrderSuccess = () => {
    clearCart();
    navigate('/wholesaler/orders');
  };

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const filteredManufacturers = manufacturers.filter(manufacturer =>
    manufacturer.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = getCartTotals();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 bg-gray-900 min-h-full">
          {/* Header */}
          <div className="mb-8">
            {view === "manufacturers" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      🏭 Manufacturer Directory
                    </h1>
                    <p className="text-gray-400 mt-1">
                      Select a manufacturer to view and order medicines
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <RealTimeNotifications socket={socketRef.current} />
                    {/* Cart Button */}
                    <button
                      onClick={() => setShowCart(true)}
                      className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <ShoppingCart size={20} />
                     
                      {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-center mb-8">
                  <div className="relative w-full max-w-xl">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search manufacturers by name or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-600 bg-gray-800 text-white rounded-lg pl-10 pr-4 py-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {view === "products" && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedManufacturer(null);
                    setProducts([]);
                    setView("manufacturers");
                  }}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft size={20} />
                  Back to Manufacturers
                </button>
                
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {selectedManufacturer?.businessName}'s Products
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {products.length} products available
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowCart(true)}
                    className="relative flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <ShoppingCart size={18} />
              
                    {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {view === "order-summary" && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("products")}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft size={20} />
                  Back to Products
                </button>
                <h1 className="text-2xl font-bold text-white">
                  Order Summary ({cart.length} items)
                </h1>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          )}

          {/* Manufacturers View */}
          {!loading && view === "manufacturers" && (
            <>
              {filteredManufacturers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredManufacturers.map((manufacturer) => (
                    <div
                      key={manufacturer.id}
                      onClick={() => handleManufacturerClick(manufacturer)}
                      className="bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-700 hover:border-purple-500 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-lg mb-4 mx-auto group-hover:bg-purple-700">
                        <Building className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-white text-center mb-3">
                        {manufacturer.businessName}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-300 justify-center">
                        <MapPin size={16} className="text-purple-400" />
                        <span className="text-sm">
                          {manufacturer.state}, {manufacturer.country}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-gray-700 mt-4">
                        <span className="text-purple-400 text-sm">
                          View Products →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8">
                  <div className="text-4xl mb-4">🏭</div>
                  <p className="text-lg">No manufacturers found</p>
                </div>
              )}
            </>
          )}

          {/* Products View */}
          {!loading && view === "products" && (
            <>
              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-lg">No products available</p>
                </div>
              )}
            </>
          )}

          {/* Order Summary View */}
          {!loading && view === "order-summary" && (
            <OrderSummary
              onBack={() => setView("products")}
              onSubmit={handleOrderSuccess}
            />
          )}

          {/* Product Details Modal */}
          {showProductDetails && selectedProduct && (
            <ProductDetailsModal
              product={selectedProduct}
              onClose={() => {
                setShowProductDetails(false);
                setSelectedProduct(null);
              }}
              onAddToCart={() => {
                setShowProductDetails(false);
                setSelectedProduct(null);
              }}
            />
          )}

          {/* Cart Sidebar */}
          <CartSidebar
            isOpen={showCart}
            onClose={() => setShowCart(false)}
            onPlaceOrder={handlePlaceOrder}
          />
        </div>
      </main>
    </div>
  );
};

// Export the component wrapped with CartProvider
export default function WholesalerCatalogWrapper() {
  return (
    <CartProvider>
      <WholesalerCatalog />
    </CartProvider>
  );
}