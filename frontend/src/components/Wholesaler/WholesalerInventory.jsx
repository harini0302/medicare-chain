import React, { useState, useMemo, useEffect, useRef } from "react";
import { LayoutDashboard, Package, ShoppingCart, Truck, BarChart3, Settings, LogOut, Edit, Save, X, Plus, Trash2, ClipboardList, FileText, Mail, Ship, Zap, Bell, Search, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import axios from "axios";

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

// Utility function for conditional classes
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Date formatting utility functions
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
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

  const addMedicine = async (medicineData) => {
    try {
      const user = getUserData();
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const formData = new FormData();
      
      if (medicineData.image instanceof File) {
        formData.append("image", medicineData.image);
      }

      const fields = {
        sku: medicineData.sku || "",
        name: medicineData.name || "",
        description: medicineData.description || "",
        unit: medicineData.unit || "",
        unit_price: medicineData.unit_price ? parseFloat(medicineData.unit_price) : 0,
        tax_rate: medicineData.tax_rate ? parseFloat(medicineData.tax_rate) : 0,
        mfg_date: formatDateForInput(medicineData.mfg_date) || new Date().toISOString().split('T')[0],
        expiry_date: formatDateForInput(medicineData.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: medicineData.category || "",
        stock_qty: medicineData.stock_qty ? parseInt(medicineData.stock_qty) : 0,
        status: medicineData.status || "Stock",
        user_email: user.email
      };

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await axios.post(MEDICINES_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newMedicine = response.data;
      setMedicines(prev => [...prev, newMedicine]);
      return newMedicine;
    } catch (error) {
      console.error("❌ Error adding medicine:", error);
      throw error;
    }
  };

  const updateMedicine = async (id, medicineData) => {
    try {
      const updateData = {
        sku: medicineData.sku?.trim() || "",
        name: medicineData.name?.trim() || "",
        description: medicineData.description?.trim() || "",
        unit: medicineData.unit || "",
        unit_price: medicineData.unit_price ? parseFloat(medicineData.unit_price) : 0,
        tax_rate: medicineData.tax_rate ? parseFloat(medicineData.tax_rate) : 0,
        mfg_date: formatDateForInput(medicineData.mfg_date) || new Date().toISOString().split('T')[0],
        expiry_date: formatDateForInput(medicineData.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: medicineData.category || "health devices",
        stock_qty: medicineData.stock_qty ? parseInt(medicineData.stock_qty) : 0,
        status: "Stock",
        user_email: getUserData()?.email || ""
      };

      let response;
      
      if (medicineData.image instanceof File) {
        const formData = new FormData();
        Object.entries(updateData).forEach(([key, value]) => {
          formData.append(key, value.toString());
        });
        formData.append("image", medicineData.image);

        response = await axios.put(
          `${MEDICINES_API}/${id}`, 
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        const urlParams = new URLSearchParams();
        Object.entries(updateData).forEach(([key, value]) => {
          urlParams.append(key, value.toString());
        });

        response = await axios.put(
          `${MEDICINES_API}/${id}`, 
          urlParams,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      }

      const updatedMedicine = response.data;
      setMedicines(prev => prev.map(item => 
        item.id === id ? { ...item, ...updatedMedicine } : item
      ));
      
      return updatedMedicine;
    } catch (error) {
      console.error("❌ Error updating medicine:", error);
      throw error;
    }
  };

  const deleteMedicine = async (id) => {
    try {
      await axios.delete(`${MEDICINES_API}/${id}`);
      setMedicines(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("❌ Error deleting medicine:", error);
      throw error;
    }
  };

  const deleteMultipleMedicines = async (ids) => {
    try {
      const deletePromises = ids.map(id => axios.delete(`${MEDICINES_API}/${id}`));
      await Promise.all(deletePromises);
      setMedicines(prev => prev.filter(item => !ids.includes(item.id)));
    } catch (error) {
      console.error("❌ Error deleting medicines:", error);
      throw error;
    }
  };

  const getMedicinesCount = () => medicines.length;

  const getLowStockCount = () => medicines.filter(med => med.stock_qty < 100).length;

  return {
    medicines,
    loading,
    fetchMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    deleteMultipleMedicines,
    getMedicinesCount,
    getLowStockCount,
  };
};

const WholesalerInventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [newRows, setNewRows] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingRows, setEditingRows] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);
  const [updatingRows, setUpdatingRows] = useState(new Set());
  const [isMobileView, setIsMobileView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();
  const skuCounterRef = useRef(1);

  const COMPANY_API = "http://localhost:8080/api/check-company";

  // Use the medicines hook
  const {
    medicines: inventoryData,
    loading,
    fetchMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    deleteMultipleMedicines,
    getMedicinesCount,
    getLowStockCount
  } = useMedicines();

  const navigate = useNavigate();
  const location = useLocation();

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch medicines on component mount
  useEffect(() => {
    fetchMedicines();
  }, []);

  // Update SKU counter when medicines are loaded
  useEffect(() => {
    if (inventoryData.length > 0) {
      const maxSku = inventoryData.reduce((max, item) => {
        const match = item.sku?.match(/\d+/);
        return match ? Math.max(max, parseInt(match[0])) : max;
      }, 0);
      skuCounterRef.current = maxSku + 1;
    }
  }, [inventoryData]);

  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath === 'No image' || imagePath === 'NULL') return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('blob:')) return imagePath;
    if (imagePath.startsWith('/')) {
      return `http://localhost:8080${imagePath}`;
    }
    return `http://localhost:8080/uploads/${imagePath}`;
  };

  const getStockStatus = (stockQty) => {
    if (stockQty < 100) {
      return { status: "Low Stock", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500/50" };
    } else if (stockQty >= 100 && stockQty <= 200) {
      return { status: "Medium Stock", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" };
    } else {
      return { status: "High Stock", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500/50" };
    }
  };

  const checkCompanyVerification = async (email) => {
    try {
      console.log("Making request to check company for email:", email);
      const response = await axios.get(`${COMPANY_API}?email=${encodeURIComponent(email)}`);
      console.log("Company check response:", response.data);
      return response.data.exists;
    } catch (error) {
      console.error("Error checking company verification:", error);
      if (error.response) {
        console.error("Response error:", error.response.data);
      }
      return false;
    }
  };

  const categoryOptions = [
    { value: "health devices", label: "Health Devices" },
    { value: "diabetic care", label: "Diabetic Care" },
    { value: "skin care", label: "Skin Care" },
    { value: "womens health", label: "Women's Health" },
    { value: "travel needs", label: "Travel Needs" },
    { value: "supports & braces", label: "Supports & Braces" },
    { value: "heart health", label: "Heart Health" },
    { value: "vitamins and supplements", label: "Vitamins and Supplements" },
    { value: "allergy", label: "Allergy" },
    { value: "baby care", label: "Baby Care" },
    { value: "health drinks", label: "Health Drinks" },
    { value: "oral care", label: "Oral Care" }
  ];

  const getCategoryUnits = (category) => {
    const categoryMap = {
      "health devices": ["Pieces", "Sets", "Kits"],
      "diabetic care": ["Strips", "Lancets", "Bottles", "Pens", "Cartridges"],
      "skin care": ["Tubes", "Bottles", "Jars", "Pumps", "Packs"],
      "womens health": ["Packs", "Tablets", "Capsules", "Tests", "Bottles"],
      "travel needs": ["Kits", "Packs", "Bottles", "Pieces", "Sets"],
      "supports & braces": ["Pieces", "Pairs", "Sizes", "Sets"],
      "heart health": ["Tablets", "Capsules", "Bottles", "Packs"],
      "vitamins and supplements": ["Tablets", "Capsules", "Softgels", "Bottles", "Packs"],
      "allergy": ["Tablets", "Capsules", "Syrup", "Bottles", "Sprays"],
      "baby care": ["Bottles", "Tubes", "Packs", "Jars", "Pieces"],
      "health drinks": ["Bottles", "Sachets", "Cans", "Packets", "Jars"],
      "oral care": ["Tubes", "Bottles", "Packs", "Pieces", "Brushes"]
    };
    
    return categoryMap[category] || [];
  };

  const generateSKU = (category = "health devices") => {
    const categoryPrefix = category.slice(0, 3).toUpperCase();
    const counter = skuCounterRef.current.toString().padStart(3, "0");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    skuCounterRef.current += 1;
    return `SKU-${categoryPrefix}-${counter}${random}`;
  };

  const initializeNewRow = () => {
    const defaultCategory = categoryOptions[0].value;
    const newSku = generateSKU(defaultCategory);

    const defaultUnits = getCategoryUnits(defaultCategory);
    const defaultUnit = defaultUnits.length > 0 ? defaultUnits[0] : "";

    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 31536000000).toISOString().split('T')[0];

    return {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: newSku,
      name: "",
      category: defaultCategory,
      description: "",
      unit_price: 0,
      stock_qty: 0,
      unit: defaultUnit,
      tax_rate: 0,
      mfg_date: today,
      expiry_date: nextYear,
      status: "Stock",
      isNew: true,
    };
  };

  const handleAddMedicine = () => {
    setNewRows((prev) => [...prev, initializeNewRow()]);
  };

  const handleEditRow = (id) => {
    const newEditingRows = new Set(editingRows);
    newEditingRows.add(id);
    setEditingRows(newEditingRows);
  };

  const handleCancelEdit = (id) => {
    const newEditingRows = new Set(editingRows);
    newEditingRows.delete(id);
    setEditingRows(newEditingRows);
    fetchMedicines();
  };

  const handleMedicineUpdate = (id, field, value) => {
    // This would need to be implemented based on your state structure
    console.log("Update medicine:", id, field, value);
  };

  const handleExistingImageUpload = (id, file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("❌ Image size should be less than 2MB");
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      // This would need to update the state
      console.log("Upload image for:", id, file);
    }
  };

  const handleNewRowUpdate = (id, field, value) => {
    setNewRows((prev) => 
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleImageUpload = (id, file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("❌ Image size should be less than 2MB");
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      handleNewRowUpdate(id, "image", file);
      handleNewRowUpdate(id, "imagePreview", imageUrl);
    }
  };

  const handleSaveNewRow = async (row) => {
    try {
      setSaving(true);
      
      const user = getUserData();
      if (!user?.email) {
        alert("❌ User email not found. Please log in again.");
        return;
      }

      if (!row.name || !row.sku) {
        alert("❌ Medicine name and SKU are required fields.");
        return;
      }

      if (row.stock_qty < 0) {
        alert("❌ Stock quantity cannot be negative.");
        return;
      }

      const isCompanyVerified = await checkCompanyVerification(user.email);
      if (!isCompanyVerified) {
        alert("❌ Please complete company verification before adding medicines.");
        return;
      }

      // Use the hook to add medicine
      await addMedicine(row);
      
      // Remove from new rows
      setNewRows((prev) => prev.filter((r) => r.id !== row.id));
      
      if (row.imagePreview && row.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(row.imagePreview);
      }
      
      alert("✅ Medicine saved successfully!");
    } catch (error) {
      console.error("Error saving medicine:", error);
      alert("❌ Failed to save medicine: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMedicine = async (medicine) => {
    try {
      setUpdatingRows(prev => new Set(prev).add(medicine.id));
      
      // Use the hook to update medicine
      await updateMedicine(medicine.id, medicine);
      
      // Remove from editing set
      const newEditingRows = new Set(editingRows);
      newEditingRows.delete(medicine.id);
      setEditingRows(newEditingRows);

      alert("✅ Medicine updated successfully!");
    } catch (error) {
      console.error("❌ Error updating medicine:", error);
      alert(`❌ Failed to update medicine: ${error.response?.data?.message || error.message}`);
    } finally {
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicine.id);
        return newSet;
      });
    }
  };

  const handleDeleteMedicine = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this medicine?");
    if (!confirmDelete) return;

    try {
      // Use the hook to delete medicine
      await deleteMedicine(id);
      alert("✅ Medicine deleted successfully!");
    } catch (error) {
      console.error("Error deleting medicine:", error);
      alert("❌ Failed to delete medicine.");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedRows.size} selected medicines?`);
    if (!confirmDelete) return;

    try {
      const existingIds = Array.from(selectedRows).filter(id => !id.toString().startsWith('new-'));
      
      // Use the hook to delete multiple medicines
      await deleteMultipleMedicines(existingIds);

      setNewRows(prev => prev.filter(row => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
      alert("✅ Selected medicines deleted successfully!");
    } catch (error) {
      console.error("Error deleting medicines:", error);
      alert("❌ Failed to delete some medicines.");
    }
  };

  const handleSaveAll = async () => {
    if (newRows.length === 0) {
      alert("No new medicines to save.");
      return;
    }

    const user = getUserData();
    
    if (!user || !user.email) {
      alert("❌ User email not found. Please log in again.");
      return;
    }

    const isCompanyVerified = await checkCompanyVerification(user.email);
    
    if (!isCompanyVerified) {
      alert("❌ Please complete company verification before adding medicines. Go to your dashboard to verify your company.");
      return;
    }

    try {
      const savePromises = newRows.map(async (row) => {
        return await addMedicine(row);
      });

      await Promise.all(savePromises);
      setNewRows([]);
      alert(`✅ ${newRows.length} medicines saved successfully!`);
    } catch (error) {
      console.error("Error saving medicines:", error);
      if (error.response) {
        alert("❌ Failed to save some medicines: " + (error.response.data?.message || error.response.data));
      } else {
        alert("❌ Failed to save some medicines.");
      }
    }
  };

  const handleRemoveNewRow = (id) => {
    setNewRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCancelAll = () => {
    if (newRows.length === 0) return;
    const confirmCancel = window.confirm(
      "Are you sure you want to discard all unsaved rows?"
    );
    if (confirmCancel) {
      setNewRows([]);
    }
  };

  const getUserData = () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      
      if (!userData) {
        console.log("❌ No user data found in storage");
        return null;
      }
      
      const parsedData = JSON.parse(userData);
      
      if (!parsedData.email) {
        console.log("❌ No email found in user data");
        return null;
      }
      
      return parsedData;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userToken');
    navigate('/');
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set([...visibleData.map(item => item.id), ...newRows.map(row => row.id)]);
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const filteredData = useMemo(() => {
    let data = [...inventoryData];
    
    if (searchQuery) {
      data = data.filter(
        (i) =>
          i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      data = data.filter((i) => i.category === selectedCategory);
    }
    
    data.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'sku':
          aValue = a.sku?.toLowerCase() || '';
          bValue = b.sku?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.unit_price || 0;
          bValue = b.unit_price || 0;
          break;
        case 'stock':
          aValue = a.stock_qty || 0;
          bValue = b.stock_qty || 0;
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'expiry':
          aValue = new Date(a.expiry_date);
          bValue = new Date(b.expiry_date);
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return data;
  }, [inventoryData, searchQuery, selectedCategory, sortBy, sortOrder]);

  const visibleData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const renderEditableField = (medicine, field, type = "text", options = []) => {
    if (editMode && editingRows.has(medicine.id)) {
      switch (type) {
        case "select":
          return (
            <select
              value={medicine[field] || ""}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        case "number":
          return (
            <input
              type="number"
              value={medicine[field] || 0}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          );
        case "date":
          return (
            <input
              type="date"
              value={formatDateForInput(medicine[field])}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          );
        default:
          return (
            <input
              type="text"
              value={medicine[field] || ""}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          );
      }
    } else {
      if (field === 'unit_price') {
        return formatCurrency(medicine[field]);
      }
      if (field === 'mfg_date' || field === 'expiry_date') {
        return medicine[field] ? formatDateForInput(medicine[field]) : "-";
      }
      return medicine[field] || "-";
    }
  };

  // Mobile Card View Component
  const MobileMedicineCard = ({ medicine, isNew = false }) => {
    const stockStatus = getStockStatus(medicine.stock_qty);
    const isEditing = editingRows.has(medicine.id);
    const isUpdating = updatingRows.has(medicine.id);

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm truncate">{medicine.name || "New Medicine"}</h3>
            <p className="text-gray-400 text-xs">{medicine.sku}</p>
          </div>
          {editMode && (
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedRows.has(medicine.id)}
                onChange={() => handleSelectRow(medicine.id)}
                className="border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 rounded"
              />
            </div>
          )}
        </div>

        {/* Image and Basic Info */}
        <div className="flex gap-3 mb-3">
          <div className="flex-shrink-0">
            {isEditing ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => isNew ? handleImageUpload(medicine.id, e.target.files[0]) : handleExistingImageUpload(medicine.id, e.target.files[0])}
                  className="w-20 text-xs"
                />
                {(medicine.imagePreview || getImageUrl(medicine.image)) && (
                  <img
                    src={medicine.imagePreview || getImageUrl(medicine.image)}
                    alt="preview"
                    className="mt-1 w-12 h-12 object-cover rounded border border-gray-600"
                  />
                )}
              </div>
            ) : (
              getImageUrl(medicine.image) ? (
                <img
                  src={getImageUrl(medicine.image)}
                  alt={medicine.name}
                  className="w-12 h-12 object-cover rounded border border-gray-600"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", medicine.image);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No Image</span>
                </div>
              )
            )}
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Price:</span>
                <div className="text-white">
                  {isNew ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={medicine.unit_price}
                      onChange={(e) => handleNewRowUpdate(medicine.id, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-600 bg-gray-700 rounded text-white text-xs"
                      placeholder="0.00"
                    />
                  ) : (
                    renderEditableField(medicine, 'unit_price', 'number')
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Stock:</span>
                <div className="text-white">
                  {isNew ? (
                    <input
                      type="number"
                      min="0"
                      value={medicine.stock_qty}
                      onChange={(e) => handleNewRowUpdate(medicine.id, "stock_qty", parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-600 bg-gray-700 rounded text-white text-xs"
                      placeholder="0"
                    />
                  ) : (
                    renderEditableField(medicine, 'stock_qty', 'number')
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Category */}
        <div className="flex justify-between items-center mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.borderColor} border ${stockStatus.color}`}>
            {stockStatus.status}
          </span>
          <span className="text-gray-300 text-xs bg-gray-700 px-2 py-1 rounded">
            {medicine.category || "Uncategorized"}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <span className="text-gray-400">MFG:</span>
            <div className="text-white">
              {isNew ? (
                <input
                  type="date"
                  value={formatDateForInput(medicine.mfg_date)}
                  onChange={(e) => handleNewRowUpdate(medicine.id, "mfg_date", e.target.value)}
                  className="w-full px-2 py-1 border border-gray-600 bg-gray-700 rounded text-white text-xs"
                />
              ) : (
                renderEditableField(medicine, 'mfg_date', 'date')
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Expiry:</span>
            <div className="text-white">
              {isNew ? (
                <input
                  type="date"
                  value={formatDateForInput(medicine.expiry_date)}
                  onChange={(e) => handleNewRowUpdate(medicine.id, "expiry_date", e.target.value)}
                  className="w-full px-2 py-1 border border-gray-600 bg-gray-700 rounded text-white text-xs"
                />
              ) : (
                renderEditableField(medicine, 'expiry_date', 'date')
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {editMode && (
          <div className="flex space-x-2 pt-2 border-t border-gray-700">
            {isNew ? (
              <>
                <button
                  onClick={() => handleSaveNewRow(medicine)}
                  disabled={saving}
                  className={`flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1 transition-colors ${
                    saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRemoveNewRow(medicine.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1"
                >
                  <X size={12} />
                  Cancel
                </button>
              </>
            ) : isEditing ? (
              <>
                <button
                  onClick={() => handleUpdateMedicine(medicine)}
                  disabled={isUpdating}
                  className={`flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1 transition-colors ${
                    isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleCancelEdit(medicine.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1"
                >
                  <X size={12} />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEditRow(medicine.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1"
                >
                  <Edit size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteMedicine(medicine.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Mobile Sidebar Component
  const MobileSidebar = () => {
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

    const getActiveItem = () => {
      const path = location.pathname;
      if (path.includes('/inventory')) return 'inventory';
      if (path.includes('/orders')) return 'orders';
      if (path.includes('/catalog')) return 'catalog';
      if (path.includes('/dispatch')) return 'dispatch';
      if (path.includes('/reports')) return 'reports';
      if (path.includes('/dashboard')) return 'dashboard';
      return 'inventory';
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

    return (
      <>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={cn(
          "bg-gray-900 border-r border-gray-700 flex flex-col h-full transition-transform duration-300",
          "lg:translate-x-0 lg:w-64",
          isMobileMenuOpen ? "fixed left-0 top-0 z-50 w-64 translate-x-0" : "fixed -translate-x-full lg:relative lg:translate-x-0"
        )}>
          {/* Logo and Close Button */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={logo} 
                  alt="MediVerse Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-white">MediVerse</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
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

          {/* Logout */}
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
      </>
    );
  };

  // Desktop Sidebar Component
  const DesktopSidebar = () => {
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

    const getActiveItem = () => {
      const path = location.pathname;
      if (path.includes('/inventory')) return 'inventory';
      if (path.includes('/orders')) return 'orders';
      if (path.includes('/catalog')) return 'catalog';
      if (path.includes('/dispatch')) return 'dispatch';
      if (path.includes('/reports')) return 'reports';
      if (path.includes('/dashboard')) return 'dashboard';
      return 'inventory';
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

    return (
      <aside className="w-64 h-screen bg-gray-900 border-r border-gray-700 flex flex-col">
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

  return (
    <MobileMenuProvider>
      <div className="flex h-screen bg-gray-900 text-white relative">
        {isMobileView ? <MobileSidebar /> : <DesktopSidebar />}
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header with mobile menu button */}
          <header className="bg-gray-900 text-white border-b border-gray-700 px-4 lg:px-6 py-4 lg:py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              {isMobileView && (
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white">Inventory Management</h2>
                <div className="mt-1 lg:mt-2 text-xs lg:text-sm text-gray-300">
                  <span>Logged in as: </span>
                  <span className="font-semibold text-blue-300">
                    {getUserData()?.email || 'Unknown User'}
                  </span>
                  <span className="mx-1 lg:mx-2">•</span>
                  <span>Showing {inventoryData.length} medicines</span>
                  <span className="mx-1 lg:mx-2">•</span>
                  <span className={inventoryData.length === 0 ? 'text-yellow-400' : 'text-green-400'}>
                    {inventoryData.length === 0 ? 'No medicines' : `${getLowStockCount()} low stock`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAddMedicine}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Medicine</span>
              </button>
              {newRows.length > 0 && (
                <>
                  <button
                    onClick={handleSaveAll}
                    className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">Save</span> ({newRows.length})
                  </button>
                  <button
                    onClick={handleCancelAll}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Search and Filters - Mobile Optimized */}
          <div className="p-3 lg:p-4 border-b border-gray-700 bg-gray-900">
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines..."
                className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg w-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filters Toggle for Mobile */}
            <div className="flex flex-wrap gap-2 items-center">
              {isMobileView && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-white text-sm flex items-center gap-2"
                >
                  <Settings size={14} />
                  Filters {showFilters ? '↑' : '↓'}
                </button>
              )}

              {/* Filters - Collapsible on Mobile */}
              <div className={`${isMobileView && !showFilters ? 'hidden' : 'flex'} flex-col lg:flex-row gap-2 w-full lg:w-auto`}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm w-full lg:w-40"
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm w-full lg:w-32"
                  >
                    <option value="name">Name</option>
                    <option value="sku">SKU</option>
                    <option value="price">Price</option>
                    <option value="stock">Stock</option>
                  </select>
                  
                  <button
                    onClick={() => handleSortChange(sortBy)}
                    className={`px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white hover:bg-gray-600 transition-colors text-sm ${
                      sortOrder === 'asc' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-3 py-2 border rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                    editMode
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {editMode ? <Save size={14} /> : <Edit size={14} />}
                  {editMode ? 'Done' : 'Edit'}
                </button>

                {editMode && selectedRows.size > 0 && (
                  <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/50 rounded-lg px-3 py-2">
                    <span className="text-sm text-red-300">{selectedRows.size} selected</span>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden bg-gray-900 p-3 lg:p-4">
            {isMobileView ? (
              /* Mobile Card View */
              <div className="space-y-3">
                {/* New Rows */}
                {newRows.map((row) => (
                  <MobileMedicineCard key={row.id} medicine={row} isNew={true} />
                ))}

                {/* Existing Medicines */}
                {visibleData.map((medicine) => (
                  <MobileMedicineCard key={medicine.id} medicine={medicine} isNew={false} />
                ))}

                {inventoryData.length === 0 && newRows.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-6xl mb-4">💊</div>
                    <p className="text-gray-300 text-lg mb-2">No medicines found.</p>
                    <p className="text-gray-500 text-sm">Click "Add Medicine" to get started.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Table View */
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden h-full flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr className="sticky top-0 bg-gray-800">
                        {editMode && (
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">
                            <input
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={
                                selectedRows.size === visibleData.length + newRows.length &&
                                (visibleData.length + newRows.length) > 0
                              }
                              className="border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 rounded"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">SKU</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Image</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Medicine Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Description</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Unit</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Unit Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Tax Rate</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">MFG Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Expiry Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Stock Qty</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Stock Status</th>
                        {editMode && (
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-800">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {newRows.map((row) => {
                        const stockStatus = getStockStatus(row.stock_qty);
                        return (
                          <tr key={row.id} className="hover:bg-gray-750 transition-colors bg-blue-900/20">
                            {editMode && (
                              <td className="px-4 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(row.id)}
                                  onChange={() => handleSelectRow(row.id)}
                                  className="border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 rounded"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={row.sku}
                                onChange={(e) => handleNewRowUpdate(row.id, "sku", e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="SKU"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(row.id, e.target.files[0])}
                                className="w-32 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              {row.imagePreview && (
                                <img
                                  src={row.imagePreview}
                                  alt="preview"
                                  className="mt-2 w-16 h-16 object-cover rounded border border-gray-600"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                placeholder="Medicine name"
                                value={row.name}
                                onChange={(e) => handleNewRowUpdate(row.id, "name", e.target.value)}
                                className="w-40 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                placeholder="Description"
                                value={row.description}
                                onChange={(e) => handleNewRowUpdate(row.id, "description", e.target.value)}
                                className="w-48 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={row.unit}
                                onChange={(e) => handleNewRowUpdate(row.id, "unit", e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">Select Unit</option>
                                {getCategoryUnits(row.category).map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.unit_price}
                                  onChange={(e) => handleNewRowUpdate(row.id, "unit_price", parseFloat(e.target.value) || 0)}
                                  className="w-28 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={row.tax_rate}
                                  onChange={(e) => handleNewRowUpdate(row.id, "tax_rate", parseFloat(e.target.value) || 0)}
                                  className="w-24 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="0.0"
                                />
                                <span className="text-gray-400 text-sm whitespace-nowrap">%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                value={formatDateForInput(row.mfg_date)}
                                onChange={(e) => handleNewRowUpdate(row.id, "mfg_date", e.target.value)}
                                className="w-36 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                value={formatDateForInput(row.expiry_date)}
                                onChange={(e) => handleNewRowUpdate(row.id, "expiry_date", e.target.value)}
                                className="w-36 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={row.category}
                                onChange={(e) => {
                                  handleNewRowUpdate(row.id, "category", e.target.value);
                                  handleNewRowUpdate(row.id, "unit", "");
                                }}
                                className="w-40 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">Select Category</option>
                                {categoryOptions.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                value={row.stock_qty}
                                onChange={(e) => handleNewRowUpdate(row.id, "stock_qty", parseInt(e.target.value) || 0)}
                                className="w-24 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.borderColor} border ${stockStatus.color}`}>
                                {stockStatus.status}
                              </span>
                            </td>
                            {editMode && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSaveNewRow(row)}
                                    disabled={saving}
                                    className={`bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm flex items-center gap-2 transition-colors ${
                                      saving ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {saving ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Save size={16} />
                                        Save
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveNewRow(row.id)}
                                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm flex items-center gap-2 transition-colors"
                                  >
                                    <X size={16} />
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {visibleData.map((medicine) => {
                        const stockStatus = getStockStatus(medicine.stock_qty);
                        const isEditing = editingRows.has(medicine.id);
                        const isUpdating = updatingRows.has(medicine.id);

                        return (
                          <tr key={medicine.id} className="hover:bg-gray-750 transition-colors">
                            {editMode && (
                              <td className="px-4 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(medicine.id)}
                                  onChange={() => handleSelectRow(medicine.id)}
                                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'sku', 'text')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleExistingImageUpload(medicine.id, e.target.files[0])}
                                    className="w-32 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  {(medicine.imagePreview || getImageUrl(medicine.image)) && (
                                    <img
                                      src={medicine.imagePreview || getImageUrl(medicine.image)}
                                      alt="preview"
                                      className="mt-2 w-16 h-16 object-cover rounded border border-gray-600"
                                    />
                                  )}
                                </div>
                              ) : (
                                getImageUrl(medicine.image) ? (
                                  <img
                                    src={getImageUrl(medicine.image)}
                                    alt={medicine.name}
                                    className="w-16 h-16 object-cover rounded border border-gray-600"
                                    onError={(e) => {
                                      console.error("❌ Image failed to load:", medicine.image);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No Image</span>
                                  </div>
                                )
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'name', 'text')}
                            </td>
                            <td className="px-6 py-4">
                              {renderEditableField(medicine, 'description', 'text')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={medicine.unit || ""}
                                  onChange={(e) => handleMedicineUpdate(medicine.id, 'unit', e.target.value)}
                                  className="w-32 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="">Select Unit</option>
                                  {getCategoryUnits(medicine.category).map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                medicine.unit || "-"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'unit_price', 'number')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={medicine.tax_rate || 0}
                                    onChange={(e) => handleMedicineUpdate(medicine.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-400 text-sm">%</span>
                                </div>
                              ) : (
                                `${medicine.tax_rate || 0}%`
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'mfg_date', 'date')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'expiry_date', 'date')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={medicine.category || ""}
                                  onChange={(e) => {
                                    handleMedicineUpdate(medicine.id, 'category', e.target.value);
                                    handleMedicineUpdate(medicine.id, 'unit', "");
                                  }}
                                  className="w-40 px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="">Select Category</option>
                                  {categoryOptions.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                medicine.category || "-"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderEditableField(medicine, 'stock_qty', 'number')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.borderColor} border ${stockStatus.color}`}>
                                {stockStatus.status}
                              </span>
                            </td>
                            {editMode && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateMedicine(medicine)}
                                        disabled={isUpdating}
                                        className={`bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm flex items-center gap-1 transition-colors ${
                                          isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                      >
                                        {isUpdating ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save size={14} />
                                            Save
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleCancelEdit(medicine.id)}
                                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                                      >
                                        <X size={14} />
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditRow(medicine.id)}
                                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                                      >
                                        <Edit size={14} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMedicine(medicine.id)}
                                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                                      >
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {inventoryData.length === 0 && newRows.length === 0 && (
                        <tr>
                          <td colSpan={editMode ? "14" : "13"} className="px-6 py-16 text-center">
                            <div className="text-gray-400 text-6xl mb-4">💊</div>
                            <p className="text-gray-300 text-lg mb-2">No medicines found.</p>
                            <p className="text-gray-500 text-sm">Click "Add Medicine" to get started.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > itemsPerPage && (
                  <div className="border-t border-gray-700 px-6 py-4 bg-gray-750">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Showing {visibleData.length} of {filteredData.length} medicines
                        {newRows.length > 0 && ` + ${newRows.length} new`}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg">
                          Page {currentPage} of {Math.ceil(filteredData.length / itemsPerPage)}
                        </span>
                        <button
                          disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredData.length / itemsPerPage), prev + 1))}
                          className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </MobileMenuProvider>
  );
};

// Export the component wrapped with MobileMenuProvider
const WholesalerInventoryWithProvider = () => (
  <MobileMenuProvider>
    <WholesalerInventory />
  </MobileMenuProvider>
);

export default WholesalerInventoryWithProvider;