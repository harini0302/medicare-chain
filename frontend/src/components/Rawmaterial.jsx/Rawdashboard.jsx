// src/pages/Manufacturer/RawMaterialsDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, 
  Bell, 
  Package, 
  Truck, 
  FileText, 
  Mail, 
  Ship, 
  Zap, 
  ShoppingCart, 
  LogOut, 
  Search, 
  DollarSign, 
  Users, 
  ClipboardList, 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Clock,
  Beaker,
  Leaf,
  Pill,
  Shield,
  Thermometer,
  Activity,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  Database,
  Layers,
  Box,  RefreshCw 
} from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = "http://localhost:8080/api"; 

// Simple cn utility function
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Reuse Sidebar Component from ManufacturerDashboard
const Sidebar = ({ activePage = 'rawmaterials' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Package, label: "Inventory Management", id: "inventory" },
    { icon: ClipboardList, label: "Order Management", id: "orders" },
    { icon: FileText, label: "Invoices", id: "invoices" },
    { icon: Beaker, label: "Raw Materials", id: "rawmaterials" },
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
    if (path.includes('/rawmaterials')) return 'rawmaterials';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard')) return 'dashboard';
    return activePage;
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
      case 'rawmaterials':
        navigate('/manufacturer/raw-materials');
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
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userToken');
    navigate('/');
  };

  const MobileOverlay = () => (
    <div 
      className={cn(
        "lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300",
        isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={() => setIsMobileMenuOpen(false)}
    />
  );

  const SidebarContent = ({ mobile = false }) => (
    <div className={cn(
      "bg-gray-900 border-r border-gray-700 flex flex-col h-full",
      mobile 
        ? "fixed left-0 top-0 z-50 w-64 h-screen transform transition-transform duration-300 ease-in-out" 
        : "w-64",
      mobile && (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={logo} alt="Manufacturer Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-semibold text-white">Manufacturer</span>
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
    </div>
  );

  return (
    <>
      <MobileOverlay />
      <div className="lg:hidden"><SidebarContent mobile={true} /></div>
      <div className="hidden lg:block"><SidebarContent /></div>
    </>
  );
};

// Raw Materials Dashboard Component
const RawMaterialsDashboard = () => {
  const navigate = useNavigate();
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [categories] = useState([
    'Active Pharmaceutical Ingredients (API)',
    'Excipients',
    'Solvents & Reagents',
    'Packaging Materials',
    'Catalysts',
    'Intermediates',
    'Antibiotics',
    'Analgesics',
    'Vitamins',
    'Hormones',
    'Biologics',
    'Other'
  ]);

  // Form state for adding/editing
  const [formData, setFormData] = useState({
    name: '',
    chemicalName: '',
    iupacName: '',
    molecularFormula: '',
    molecularWeight: '',
    casNumber: '',
    category: '',
    supplierId: '',
    supplierName: '',
    unitPrice: '',
    unit: 'kg',
    minStockLevel: '',
    reorderQuantity: '',
    shelfLife: '',
    storageCondition: 'Room Temperature',
    purity: '',
    batchNumber: '',
    expiryDate: '',
    quantityInStock: '',
    status: 'active',
    description: '',
    hazards: '',
    msdsUrl: '',
    certificateOfAnalysis: ''
  });

  // Sample raw materials data (replace with API data)
  const sampleMaterials = [
    {
      id: 1,
      name: 'Paracetamol',
      chemicalName: 'N-(4-hydroxyphenyl)acetamide',
      iupacName: 'N-(4-hydroxyphenyl)ethanamide',
      molecularFormula: 'C8H9NO2',
      molecularWeight: '151.16',
      casNumber: '103-90-2',
      category: 'Analgesics',
      supplier: 'BASF Pharma',
      unitPrice: 4500,
      unit: 'kg',
      minStockLevel: 50,
      reorderQuantity: 100,
      currentStock: 120,
      shelfLife: '36 months',
      storageCondition: 'Room Temperature',
      purity: '99.9%',
      batchNumber: 'PARA-2024-001',
      expiryDate: '2026-12-31',
      status: 'active',
      lastOrderDate: '2024-01-15',
      usageRate: 'High'
    },
    {
      id: 2,
      name: 'Ibuprofen',
      chemicalName: '(RS)-2-(4-(2-methylpropyl)phenyl)propanoic acid',
      iupacName: '(RS)-2-[4-(2-methylpropyl)phenyl]propanoic acid',
      molecularFormula: 'C13H18O2',
      molecularWeight: '206.28',
      casNumber: '15687-27-1',
      category: 'Analgesics',
      supplier: 'Sigma-Aldrich',
      unitPrice: 5200,
      unit: 'kg',
      minStockLevel: 40,
      reorderQuantity: 80,
      currentStock: 35,
      shelfLife: '36 months',
      storageCondition: 'Room Temperature',
      purity: '99.8%',
      batchNumber: 'IBU-2024-002',
      expiryDate: '2026-11-30',
      status: 'low_stock',
      lastOrderDate: '2024-01-10',
      usageRate: 'Medium'
    },
    {
      id: 3,
      name: 'Ascorbic Acid',
      chemicalName: 'L-ascorbic acid',
      iupacName: '(5R)-[(1S)-1,2-dihydroxyethyl]-3,4-dihydroxyfuran-2(5H)-one',
      molecularFormula: 'C6H8O6',
      molecularWeight: '176.12',
      casNumber: '50-81-7',
      category: 'Vitamins',
      supplier: 'Roche Pharmaceuticals',
      unitPrice: 2800,
      unit: 'kg',
      minStockLevel: 100,
      reorderQuantity: 200,
      currentStock: 250,
      shelfLife: '24 months',
      storageCondition: 'Refrigerated',
      purity: '99.5%',
      batchNumber: 'VITC-2024-003',
      expiryDate: '2025-06-30',
      status: 'active',
      lastOrderDate: '2024-01-20',
      usageRate: 'High'
    },
    {
      id: 4,
      name: 'Cetirizine HCl',
      chemicalName: '2-[2-[4-[(4-chlorophenyl)phenylmethyl]piperazin-1-yl]ethoxy]acetic acid dihydrochloride',
      iupacName: '2-[2-[4-[(4-chlorophenyl)phenylmethyl]piperazin-1-yl]ethoxy]acetic acid;dihydrochloride',
      molecularFormula: 'C21H25ClN2O3·2HCl',
      molecularWeight: '461.81',
      casNumber: '83881-52-1',
      category: 'Antihistamines',
      supplier: 'GlaxoSmithKline',
      unitPrice: 8900,
      unit: 'kg',
      minStockLevel: 25,
      reorderQuantity: 50,
      currentStock: 60,
      shelfLife: '48 months',
      storageCondition: 'Room Temperature',
      purity: '99.7%',
      batchNumber: 'CET-2024-004',
      expiryDate: '2027-03-31',
      status: 'active',
      lastOrderDate: '2024-01-05',
      usageRate: 'Medium'
    },
    {
      id: 5,
      name: 'Metformin HCl',
      chemicalName: 'N,N-dimethylimidodicarbonimidic diamide hydrochloride',
      iupacName: 'N,N-dimethylimidodicarbonimidic diamide;hydrochloride',
      molecularFormula: 'C4H11N5·HCl',
      molecularWeight: '165.63',
      casNumber: '1115-70-4',
      category: 'Antidiabetics',
      supplier: 'Merck & Co.',
      unitPrice: 3200,
      unit: 'kg',
      minStockLevel: 75,
      reorderQuantity: 150,
      currentStock: 180,
      shelfLife: '36 months',
      storageCondition: 'Room Temperature',
      purity: '99.6%',
      batchNumber: 'MET-2024-005',
      expiryDate: '2026-09-30',
      status: 'active',
      lastOrderDate: '2024-01-18',
      usageRate: 'High'
    },
    {
      id: 6,
      name: 'Amoxicillin Trihydrate',
      chemicalName: '(2S,5R,6R)-6-[(2R)-2-amino-2-(4-hydroxyphenyl)acetyl]amino-3,3-dimethyl-7-oxo-4-thia-1-azabicyclo[3.2.0]heptane-2-carboxylic acid trihydrate',
      iupacName: '(2S,5R,6R)-6-[(2R)-2-amino-2-(4-hydroxyphenyl)acetyl]amino-3,3-dimethyl-7-oxo-4-thia-1-azabicyclo[3.2.0]heptane-2-carboxylic acid;trihydrate',
      molecularFormula: 'C16H19N3O5S·3H2O',
      molecularWeight: '419.45',
      casNumber: '61336-70-7',
      category: 'Antibiotics',
      supplier: 'Pfizer',
      unitPrice: 6800,
      unit: 'kg',
      minStockLevel: 30,
      reorderQuantity: 60,
      currentStock: 15,
      shelfLife: '24 months',
      storageCondition: 'Refrigerated',
      purity: '99.9%',
      batchNumber: 'AMOX-2024-006',
      expiryDate: '2025-08-31',
      status: 'critical',
      lastOrderDate: '2023-12-15',
      usageRate: 'High'
    }
  ];

  // Sample suppliers
  const sampleSuppliers = [
    { id: 1, name: 'BASF Pharma', country: 'Germany' },
    { id: 2, name: 'Sigma-Aldrich', country: 'USA' },
    { id: 3, name: 'Roche Pharmaceuticals', country: 'Switzerland' },
    { id: 4, name: 'GlaxoSmithKline', country: 'UK' },
    { id: 5, name: 'Merck & Co.', country: 'USA' },
    { id: 6, name: 'Pfizer', country: 'USA' },
    { id: 7, name: 'Novartis', country: 'Switzerland' },
    { id: 8, name: 'Sanofi', country: 'France' }
  ];

  useEffect(() => {
    fetchRawMaterials();
    fetchUserData();
    setSuppliers(sampleSuppliers);
  }, []);

  const fetchRawMaterials = async () => {
    setLoading(true);
    try {
      // Simulate API call with sample data
      setTimeout(() => {
        setRawMaterials(sampleMaterials);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('Failed to load raw materials');
      setLoading(false);
    }
  };

  const fetchUserData = () => {
    try {
      const storedData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status, currentStock, minStockLevel) => {
    let badgeClass = '';
    let icon = null;
    let text = '';
    
    if (currentStock <= minStockLevel * 0.3) {
      badgeClass = 'bg-red-500/20 text-red-400';
      icon = <AlertTriangle className="w-3 h-3 mr-1" />;
      text = 'Critical';
    } else if (currentStock <= minStockLevel) {
      badgeClass = 'bg-yellow-500/20 text-yellow-400';
      icon = <AlertTriangle className="w-3 h-3 mr-1" />;
      text = 'Low Stock';
    } else if (status === 'expiring_soon') {
      badgeClass = 'bg-orange-500/20 text-orange-400';
      icon = <Clock className="w-3 h-3 mr-1" />;
      text = 'Expiring Soon';
    } else {
      badgeClass = 'bg-green-500/20 text-green-400';
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
      text = 'In Stock';
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const getUsageRateBadge = (rate) => {
    switch(rate.toLowerCase()) {
      case 'high':
        return <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">High</span>;
      case 'medium':
        return <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">Medium</span>;
      case 'low':
        return <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">Low</span>;
      default:
        return <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-1 rounded">Unknown</span>;
    }
  };

  const getCategoryIcon = (category) => {
    switch(category.toLowerCase()) {
      case 'analgesics':
        return <Thermometer className="w-4 h-4 text-blue-400" />;
      case 'antibiotics':
        return <Shield className="w-4 h-4 text-green-400" />;
      case 'vitamins':
        return <Leaf className="w-4 h-4 text-yellow-400" />;
      case 'antihistamines':
        return <Activity className="w-4 h-4 text-purple-400" />;
      case 'antidiabetics':
        return <Activity className="w-4 h-4 text-red-400" />;
      default:
        return <Beaker className="w-4 h-4 text-gray-400" />;
    }
  };

  // Filter materials
  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.chemicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.casNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || material.supplier === supplierFilter;
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // Calculate statistics
  const stats = {
    totalMaterials: rawMaterials.length,
    activeMaterials: rawMaterials.filter(m => m.status === 'active' && m.currentStock > m.minStockLevel).length,
    lowStockMaterials: rawMaterials.filter(m => m.currentStock <= m.minStockLevel && m.currentStock > m.minStockLevel * 0.3).length,
    criticalMaterials: rawMaterials.filter(m => m.currentStock <= m.minStockLevel * 0.3).length,
    totalValue: rawMaterials.reduce((sum, m) => sum + (m.unitPrice * m.currentStock), 0),
    highUsageMaterials: rawMaterials.filter(m => m.usageRate === 'High').length
  };

  const handleAddMaterial = () => {
    setShowAddModal(true);
    setFormData({
      name: '',
      chemicalName: '',
      iupacName: '',
      molecularFormula: '',
      molecularWeight: '',
      casNumber: '',
      category: '',
      supplierId: '',
      supplierName: '',
      unitPrice: '',
      unit: 'kg',
      minStockLevel: '',
      reorderQuantity: '',
      shelfLife: '',
      storageCondition: 'Room Temperature',
      purity: '',
      batchNumber: '',
      expiryDate: '',
      quantityInStock: '',
      status: 'active',
      description: '',
      hazards: '',
      msdsUrl: '',
      certificateOfAnalysis: ''
    });
  };

  const handleEditMaterial = (material) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      chemicalName: material.chemicalName,
      iupacName: material.iupacName,
      molecularFormula: material.molecularFormula,
      molecularWeight: material.molecularWeight,
      casNumber: material.casNumber,
      category: material.category,
      supplierId: '',
      supplierName: material.supplier,
      unitPrice: material.unitPrice,
      unit: material.unit,
      minStockLevel: material.minStockLevel,
      reorderQuantity: material.reorderQuantity,
      shelfLife: material.shelfLife,
      storageCondition: material.storageCondition,
      purity: material.purity,
      batchNumber: material.batchNumber,
      expiryDate: material.expiryDate,
      quantityInStock: material.currentStock,
      status: material.status,
      description: '',
      hazards: '',
      msdsUrl: '',
      certificateOfAnalysis: ''
    });
    setShowEditModal(true);
  };

  const handleSaveMaterial = () => {
    if (showAddModal) {
      // Add new material
      const newMaterial = {
        id: rawMaterials.length + 1,
        ...formData,
        currentStock: parseInt(formData.quantityInStock) || 0,
        lastOrderDate: new Date().toISOString().split('T')[0],
        usageRate: 'Medium'
      };
      setRawMaterials(prev => [...prev, newMaterial]);
      toast.success('Raw material added successfully');
    } else if (showEditModal && selectedMaterial) {
      // Update existing material
      setRawMaterials(prev => prev.map(m => 
        m.id === selectedMaterial.id 
          ? { ...m, ...formData, currentStock: parseInt(formData.quantityInStock) || m.currentStock }
          : m
      ));
      toast.success('Raw material updated successfully');
    }
    
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedMaterial(null);
  };

  const handleDeleteMaterial = (id) => {
    if (window.confirm('Are you sure you want to delete this raw material?')) {
      setRawMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Raw material deleted successfully');
    }
  };

  const handleRequestReorder = (material) => {
    toast.info(`Reorder request sent for ${material.name} - Quantity: ${material.reorderQuantity}${material.unit}`);
    // In real app, this would call API to create purchase order
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
        <Sidebar activePage="rawmaterials" />
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading raw materials...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-950">
      <Sidebar activePage="rawmaterials" />
      
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">Raw Materials Management</h1>
                <p className="text-gray-400 text-sm mt-1">Manage Active Pharmaceutical Ingredients (APIs) & Molecules</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                onClick={fetchRawMaterials}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleAddMaterial}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, chemical name, CAS number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 lg:p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6 mb-6">
            {/* Total Materials */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Beaker className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">Total Materials</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stats.totalMaterials}</div>
              <p className="text-gray-400 text-xs lg:text-sm">APIs & Molecules</p>
            </div>

            {/* Active Stock */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">Active</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stats.activeMaterials}</div>
              <p className="text-gray-400 text-xs lg:text-sm">In good stock</p>
            </div>

            {/* Low Stock */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">Low Stock</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stats.lowStockMaterials}</div>
              <p className="text-gray-400 text-xs lg:text-sm">Needs attention</p>
            </div>

            {/* Critical */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">Critical</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stats.criticalMaterials}</div>
              <p className="text-gray-400 text-xs lg:text-sm">Urgent reorder needed</p>
            </div>

            {/* Total Value */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">Total Value</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{formatCurrency(stats.totalValue)}</div>
              <p className="text-gray-400 text-xs lg:text-sm">Inventory value</p>
            </div>

            {/* High Usage */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" />
                  </div>
                  <h3 className="text-white text-sm lg:text-base font-medium">High Usage</h3>
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stats.highUsageMaterials}</div>
              <p className="text-gray-400 text-xs lg:text-sm">Frequently used</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-300">Filter by:</span>
                </div>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
                  <Upload className="w-4 h-4" />
                  Import
                </button>
              </div>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:p-6 backdrop-blur-sm">
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-12">
                <Beaker className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 text-lg">No raw materials found</p>
                <p className="text-gray-400 mt-1">
                  {searchTerm || categoryFilter !== 'all' || supplierFilter !== 'all'
                    ? 'Try adjusting your search or filter' 
                    : 'Add your first raw material to get started'}
                </p>
                <button
                  onClick={handleAddMaterial}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Raw Material
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Chemical Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {filteredMaterials.map((material) => (
                      <tr key={material.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(material.category)}
                            <div>
                              <div className="text-sm font-medium text-white">{material.name}</div>
                              <div className="text-xs text-gray-400">{material.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{material.molecularFormula}</div>
                          <div className="text-xs text-gray-400">MW: {material.molecularWeight}</div>
                          <div className="text-xs text-gray-500">CAS: {material.casNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{material.supplier}</div>
                          <div className="text-xs text-gray-400">
                            Batch: {material.batchNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            Exp: {formatDate(material.expiryDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, (material.currentStock / material.reorderQuantity) * 100)}%`,
                                  backgroundColor: material.currentStock <= material.minStockLevel * 0.3 
                                    ? '#ef4444' 
                                    : material.currentStock <= material.minStockLevel 
                                    ? '#f59e0b' 
                                    : '#10b981'
                                }}
                              ></div>
                            </div>
                            <div className="text-sm text-white">
                              {material.currentStock}/{material.reorderQuantity}{material.unit}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Min: {material.minStockLevel}{material.unit} • Usage: {getUsageRateBadge(material.usageRate)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-green-400">
                            {formatCurrency(material.unitPrice)}/{material.unit}
                          </div>
                          <div className="text-xs text-gray-400">
                            Total: {formatCurrency(material.unitPrice * material.currentStock)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(material.status, material.currentStock, material.minStockLevel)}
                          <div className="text-xs text-gray-400 mt-1">
                            Purity: {material.purity}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {material.currentStock <= material.minStockLevel && (
                              <button
                                onClick={() => handleRequestReorder(material)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors border border-yellow-600/30"
                                title="Reorder"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors border border-red-600/30"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {showAddModal ? 'Add New Raw Material' : 'Edit Raw Material'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedMaterial(null);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Basic Information</h4>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Material Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Paracetamol"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Chemical Name</label>
                    <input
                      type="text"
                      value={formData.chemicalName}
                      onChange={(e) => setFormData({...formData, chemicalName: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., N-(4-hydroxyphenyl)acetamide"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">CAS Number *</label>
                      <input
                        type="text"
                        value={formData.casNumber}
                        onChange={(e) => setFormData({...formData, casNumber: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 103-90-2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Chemical Properties */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Chemical Properties</h4>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Molecular Formula</label>
                    <input
                      type="text"
                      value={formData.molecularFormula}
                      onChange={(e) => setFormData({...formData, molecularFormula: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., C8H9NO2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Molecular Weight</label>
                      <input
                        type="text"
                        value={formData.molecularWeight}
                        onChange={(e) => setFormData({...formData, molecularWeight: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 151.16"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Purity (%)</label>
                      <input
                        type="text"
                        value={formData.purity}
                        onChange={(e) => setFormData({...formData, purity: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 99.9"
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Stock Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Current Stock *</label>
                      <input
                        type="number"
                        value={formData.quantityInStock}
                        onChange={(e) => setFormData({...formData, quantityInStock: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Quantity"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="mg">mg</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Min Stock Level</label>
                      <input
                        type="number"
                        value={formData.minStockLevel}
                        onChange={(e) => setFormData({...formData, minStockLevel: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Minimum stock"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Reorder Quantity</label>
                      <input
                        type="number"
                        value={formData.reorderQuantity}
                        onChange={(e) => setFormData({...formData, reorderQuantity: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Reorder amount"
                      />
                    </div>
                  </div>
                </div>

                {/* Supplier & Price */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Supplier & Price</h4>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Supplier</label>
                    <select
                      value={formData.supplierName}
                      onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Unit Price *</label>
                    <input
                      type="number"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Price per unit"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Batch Number</label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., PARA-2024-001"
                    />
                  </div>
                </div>
              </div>
              
              {/* Additional Information */}
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Additional Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Shelf Life</label>
                    <input
                      type="text"
                      value={formData.shelfLife}
                      onChange={(e) => setFormData({...formData, shelfLife: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., 36 months"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Storage Condition</label>
                    <select
                      value={formData.storageCondition}
                      onChange={(e) => setFormData({...formData, storageCondition: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="Room Temperature">Room Temperature</option>
                      <option value="Refrigerated">Refrigerated (2-8°C)</option>
                      <option value="Frozen">Frozen (-20°C)</option>
                      <option value="Deep Frozen">Deep Frozen (-80°C)</option>
                      <option value="Controlled Room">Controlled Room Temp</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="3"
                    placeholder="Additional notes about this material..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedMaterial(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMaterial}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {showAddModal ? 'Add Material' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialsDashboard;