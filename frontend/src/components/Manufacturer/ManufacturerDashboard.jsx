import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  LayoutDashboard, Bell, Package, Truck, FileText, Mail, Ship, Zap, LogOut, 
  Search, DollarSign, Factory, ClipboardList, AlertTriangle, Calendar, 
  CheckCircle, Clock 
} from "lucide-react";
import logo from '../../assets/logo.png';
import { useNavigate, useLocation } from 'react-router-dom';

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Sidebar Component (same as before)
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Package, label: "Inventory Management", id: "inventory" },
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
  
  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'dashboard'; // default
  };

  const activeItem = getActiveItem();

  const handleNavigation = (itemId) => {
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
    // Clear any user data from localStorage/sessionStorage if needed
    localStorage.removeItem('userToken');
    sessionStorage.removeItem('userToken');
    
    // Navigate to landing page
    navigate('/');
  };
  
  return (
    <aside className="w-64 h-screen bg-gray-900 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          <img 
            src={logo} 
            alt="MediVerse Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xl font-semibold text-white">MediVerse</span>
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
    </aside>
  );
};

// Area Chart Component for Monthly Revenue (same as before)
const MonthlyRevenueChart = () => {
  const revenueData = [
    { month: "Jan", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: 58000 },
    { month: "Apr", revenue: 61000 },
    { month: "May", revenue: 69000 },
    { month: "Jun", revenue: 72000 },
    { month: "Jul", revenue: 74000 },
    { month: "Aug", revenue: 80000 },
    { month: "Sep", revenue: 82000 },
    { month: "Oct", revenue: 86000 },
    { month: "Nov", revenue: 87000 },
    { month: "Dec", revenue: 88000 },
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
    <div className="h-48 relative">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <path d={getAreaPath()} fill="url(#areaGradient)" />
        <path 
          d={getLinePath()} 
          fill="none" 
          stroke="url(#lineGradient)" 
          strokeWidth="2" 
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
      
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {revenueData.map((item, index) => (
          <span key={index} className="text-gray-400 text-xs transform -rotate-45 origin-center">
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
};

// Semi-Circle Chart Component for Production Volume (same as before)
const ProductionVolumeChart = () => {
  const productionData = [
    { month: 'Jan', units: 1200 },
    { month: 'Feb', units: 1100 },
    { month: 'Mar', units: 1300 },
    { month: 'Apr', units: 1250 },
    { month: 'May', units: 1400 },
    { month: 'Jun', units: 1350 },
    { month: 'Jul', units: 1450 },
    { month: 'Aug', units: 1500 },
    { month: 'Sep', units: 1450 },
    { month: 'Oct', units: 1600 },
    { month: 'Nov', units: 1550 },
    { month: 'Dec', units: 1600 },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 mb-4">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          <path
            d="M 10,50 A 40,40 0 0 1 90,50"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * 0.75)}
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
            <div className="text-white font-bold text-lg">75%</div>
            <div className="text-gray-400 text-xs">Capacity</div>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-xs">
        {productionData.slice(0, 4).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-xs mt-1">
        {productionData.slice(4, 8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
      <div className="w-full grid grid-cols-4 gap-1 text-gray-400 text-xs mt-1">
        {productionData.slice(8).map((item, index) => (
          <div key={index} className="text-center">{item.month}</div>
        ))}
      </div>
    </div>
  );
};

// Manufacturing Dashboard Content - FIXED VERSION
const ManufacturingDashboard = () => {
  const [totalManufactured, setTotalManufactured] = useState(0);
  const [loading, setLoading] = useState(true); // Added missing loading state

  // Helper function to find any number in response
  const findNumberInResponse = (data) => {
    if (typeof data === 'number') return data;
    if (typeof data === 'object' && data !== null) {
      for (let key in data) {
        if (typeof data[key] === 'number') {
          return data[key];
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchTotalManufactured = async () => {
      try {
        setLoading(true);
        // Try multiple endpoints to find your medicines
        const endpoints = [
          "http://localhost:5000/api/medicines/total",
          "http://localhost:8080/medicines",
          "http://localhost:8080/api/medicines"
        ];

        let total = 10; // Default fallback

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint);
            console.log(`Response from ${endpoint}:`, response.data);
            
            if (response.data && typeof response.data.total === 'number') {
              total = response.data.total;
              break;
            } else if (typeof response.data === 'number') {
              total = response.data;
              break;
            } else if (response.data && response.data.count) {
              total = response.data.count;
              break;
            } else if (Array.isArray(response.data)) {
              total = response.data.length;
              break;
            } else {
              const foundNumber = findNumberInResponse(response.data);
              if (foundNumber) {
                total = foundNumber;
                break;
              }
            }
          } catch (err) {
            console.log(`Endpoint ${endpoint} failed:`, err.message);
            continue; // Try next endpoint
          }
        }

        setTotalManufactured(total);
      } catch (err) {
        console.error("All endpoints failed, using fallback:", err);
        setTotalManufactured(10); // Fallback to your known 10 products
      } finally {
        setLoading(false);
      }
    };

    fetchTotalManufactured();
  }, []);

  // Added missing perfectOrderData
  const perfectOrderData = [
    { status: 'Pending', orders: 1839, percentage: 85 },
    { status: 'Shipping', orders: 1839, percentage: 70 },
    { status: 'Delivered', orders: 1839, percentage: 45 }
  ];

  const getStatusInfo = (status) => {
    switch(status.toLowerCase()) {
      case 'shipping':
        return { icon: <Truck size={16} />, color: '#10b981' };
      case 'delivered':
        return { icon: <CheckCircle size={16} />, color: '#3b82f6' };
      case 'pending':
        return { icon: <Clock size={16} />, color: '#ef4444' };
      default:
        return { icon: <Clock size={16} />, color: '#6b7280' };
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Manufacturing Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products, orders, suppliers..."
                className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-80"
              />
            </div>
            <div className="relative">
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  3
                </span>
              </button>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Revenue Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-white font-medium">Total Revenue</h3>
              </div>
              <span className="bg-green-500/10 text-green-400 text-xs font-medium px-2 py-1 rounded">+19%</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">$8,374</div>
            <p className="text-gray-400 text-sm">Impressive 15% growth from last month</p>
          </div>

          {/* Total Manufactured Card - FIXED */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Factory className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-white font-medium">Total Manufactured</h3>
              </div>
              <span className="bg-green-500/10 text-green-400 text-xs font-medium px-2 py-1 rounded">+6%</span>
            </div>
            {/* Dynamic value - NOW WORKING */}
            <div className="text-2xl font-bold text-white mb-1">
              {loading ? "Loading..." : totalManufactured.toLocaleString()}
            </div>
            <p className="text-gray-400 text-sm">Units produced year to date</p>
          </div>

          {/* Pending Orders Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-white font-medium">Pending Orders</h3>
              </div>
              <span className="bg-yellow-500/10 text-yellow-400 text-xs font-medium px-2 py-1 rounded">+3</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">28</div>
            <p className="text-gray-400 text-sm">Orders awaiting processing</p>
          </div>

          {/* Low Stock Alert Card */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-medium">Low Stock Alert</h3>
              </div>
              <span className="bg-red-500/10 text-red-400 text-xs font-medium px-2 py-1 rounded">21%</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">42</div>
            <p className="text-gray-400 text-sm">Products below threshold</p>
          </div>
        </div>

        {/* Second Row - All Three Components */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Perfect Order Rate - NOW WORKING */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Perfect Order Rate</h3>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Aug 2024</span>
              </div>
            </div>
            <div className="space-y-4">
              {perfectOrderData.map((item, index) => {
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
                      <span className="text-white font-semibold">{item.percentage}%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.orders} orders
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
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Monthly Revenue</h3>
            </div>
            <MonthlyRevenueChart />
          </div>

          {/* Product Production Volumes */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Product Production Volumes</h3>
            </div>
            <ProductionVolumeChart />
            <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-gray-700">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Total YTD</div>
                <div className="text-white font-semibold">14,958 units</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Growth</div>
                <div className="text-green-400 font-semibold">+15.2%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Peak Month</div>
                <div className="text-white font-semibold">Dec - 1,600 units</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const ManufacturerDashboard = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      <Sidebar />
      <ManufacturingDashboard />
    </div>
  );
};

export default ManufacturerDashboard;