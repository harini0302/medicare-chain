import React, { useState, useMemo, useEffect, useRef } from "react";
import { LayoutDashboard, Package, ShoppingCart, Truck, Upload, Download, BarChart3, Settings, LogOut, Edit, Save, X, Plus, Trash2, ClipboardList, FileText, Mail, Ship, Zap, Bell, Search, Menu, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import axios from "axios";

// Add these CSV utility functions at the top of the file
const convertToCSV = (data) => {
  const headers = ['SKU', 'MEDICINE NAME', 'DESCRIPTION', 'UNIT', 'UNIT PRICE', 'TAX RATE', 'MFG DATE', 'EXPIRY DATE', 'CATEGORY', 'STOCK QTY'];
  
  const rows = data.map(item => [
    item.sku || '',
    item.name || '',
    item.description || '',
    item.unit || '',
    item.unit_price || 0,
    item.tax_rate || 0,
    item.mfg_date || '',
    item.expiry_date || '',
    item.category || '',
    item.stock_qty || 0
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};

const convertToJSON = (data) => {
  return JSON.stringify(data, null, 2);
};

const formatDateForMySQL = (dateString) => {
  if (!dateString) return '';
  
  console.log(`📅 Formatting date in frontend: ${dateString}`);
  
  try {
    // If it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's an ISO string
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Try parsing other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return dateString; // Return as-is or handle error
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original if formatting fails
  }
};

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
        unit: medicineData.unit || "pcs",
        unit_price: medicineData.unit_price ? parseFloat(medicineData.unit_price).toFixed(2) : "0.00",
        tax_rate: medicineData.tax_rate ? parseFloat(medicineData.tax_rate).toFixed(2) : "0.00",
        mfg_date: formatDateForMySQL(medicineData.mfg_date) || new Date().toISOString().split('T')[0],
        expiry_date: formatDateForMySQL(medicineData.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: medicineData.category || "",
        stock_qty: medicineData.stock_qty ? parseInt(medicineData.stock_qty) : 0,
        status: medicineData.status || "Stock",
        user_email: user.email
      };

      console.log("Sending fields to API:", fields);

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
      console.error("Error response:", error.response?.data);
      throw error;
    }
  };

  const updateMedicine = async (id, medicineData, imageFile = null) => {
    try {
      console.log('🔄 Updating medicine ID:', id);
      console.log('📦 Medicine data:', medicineData);
      console.log('🖼️ Image file:', imageFile);
      
      // Get user data
      const user = getUserData();
      if (!user?.email) {
        throw new Error("User email not found");
      }
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Add the image file if provided
      if (imageFile && imageFile instanceof File) {
        formData.append("image", imageFile);
        console.log('✅ Image file added to form data:', imageFile.name);
      }
      
      // Prepare update data - match backend field names
      const updateData = {
        name: medicineData.name || medicineData.medicine_name || '',
        sku: medicineData.sku || '',
        description: medicineData.description || '',
        unit: medicineData.unit || medicineData.unit_type || 'pcs',
        unit_price: medicineData.unit_price ? parseFloat(medicineData.unit_price).toFixed(2) : "0.00",
        tax_rate: medicineData.tax_rate || medicineData.gst_percentage || "0.00",
        mfg_date: formatDateForMySQL(medicineData.mfg_date) || new Date().toISOString().split('T')[0],
        expiry_date: formatDateForMySQL(medicineData.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: medicineData.category || 'health devices',
        stock_qty: medicineData.stock_qty ? parseInt(medicineData.stock_qty) : 0,
        status: medicineData.status || 'Stock',
        hsn_code: medicineData.hsn_code || '',
        manufacturer: medicineData.manufacturer || ''
      };
      
      console.log('📤 Update data prepared:', updateData);
      
      // Add all fields to FormData
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
          console.log(`   ✓ Added ${key}: ${value}`);
        }
      });
      
      // Add user email for debugging
      formData.append('user_email', user.email);
      
      console.log('🔍 Sending PUT request with FormData');
      
      // Send update request
      const response = await axios.put(
        `${MEDICINES_API}/${id}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000 // 30 second timeout for large files
        }
      );
      
      console.log('✅ Update response:', response.data);
      
      if (response.data.success) {
        // Update local state with new data
        const updatedMedicine = response.data.medicine || { ...updateData, id };
        setMedicines(prev => prev.map(item => 
          item.id === id ? { 
            ...item, 
            ...updatedMedicine,
            // Update image if a new one was uploaded
            image: imageFile ? `/uploads/${imageFile.name}` : item.image
          } : item
        ));
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error("❌ Error updating medicine:", error);
      
      // Detailed error logging
      if (error.response) {
        console.error("❌ Server responded with:", error.response.status);
        console.error("❌ Response data:", error.response.data);
        console.error("❌ Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("❌ No response received:", error.request);
      } else {
        console.error("❌ Request setup error:", error.message);
      }
      
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
    setMedicines,
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

const Inventory = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [showExportModal, setShowExportModal] = useState(false);
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
  const [showStockFilter, setShowStockFilter] = useState(false);
  const [selectedStockFilter, setSelectedStockFilter] = useState('all');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedMedicineForStock, setSelectedMedicineForStock] = useState(null);
  const [stockAdjustmentType, setStockAdjustmentType] = useState('add');
  const [stockAdjustmentValue, setStockAdjustmentValue] = useState('');
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();
  const skuCounterRef = useRef(1);

  const COMPANY_API = "http://localhost:8080/api/check-company";

  // Use the medicines hook
  const {
    medicines: inventoryData,
    setMedicines,
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

  // Add Import/Export functions
  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      alert("Please select a file to import.");
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target.result;
        let medicines = [];
        
        if (importFile.name.endsWith('.csv')) {
          // Parse CSV
          const lines = content.split('\n');
          console.log(`Found ${lines.length} lines in CSV`);
          
          if (lines.length < 2) {
            alert("CSV file is empty or has no data rows.");
            setImporting(false);
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          console.log("CSV Headers found:", headers);
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const row = lines[i];
            const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
            const medicine = {};
            
            headers.forEach((header, index) => {
              if (index < values.length) {
                const key = header.toLowerCase().replace(/\s+/g, '_');
                medicine[key] = values[index];
              }
            });
            
            if (medicine.name || medicine.medicine_name) {
              medicines.push(medicine);
            }
          }
        } else if (importFile.name.endsWith('.json')) {
          medicines = JSON.parse(content);
        } else {
          alert("Unsupported file format. Please use CSV or JSON.");
          setImporting(false);
          return;
        }

        console.log(`Total medicines to import: ${medicines.length}`);
        
        // Get user email
        const user = getUserData();
        if (!user?.email) {
          alert("User email not found. Please log in again.");
          setImporting(false);
          return;
        }

        // Check company verification
        const isCompanyVerified = await checkCompanyVerification(user.email);
        if (!isCompanyVerified) {
          alert("❌ Please complete company verification before importing medicines.");
          setImporting(false);
          return;
        }

        // Add medicines
        let successCount = 0;
        let errorCount = 0;
        
        for (const medicine of medicines) {
          try {
            console.log("Processing medicine:", medicine);
            
            // FIX: Convert stock_qty to decimal with 2 decimal places
            const stockQtyValue = parseFloat(medicine.stock_qty || medicine.stock || 0);
            const stockQtyDecimal = parseFloat(stockQtyValue.toFixed(2));
            
            const medicineData = {
              sku: medicine.sku || medicine.SKU || generateSKU(medicine.category),
              name: medicine.name || medicine.medicine_name || 'Imported Medicine',
              description: medicine.description || '',
              unit: medicine.unit || 'pcs',
              unit_price: parseFloat(medicine.unit_price || medicine.price || 0).toFixed(2),
              tax_rate: parseFloat(medicine.tax_rate || 0).toFixed(2),
              mfg_date: formatDateForMySQL(medicine.mfg_date || new Date().toISOString()),
              expiry_date: formatDateForMySQL(medicine.expiry_date || new Date(Date.now() + 31536000000).toISOString()),
              category: medicine.category || 'health devices',
              stock_qty: parseInt(medicine.stock_qty || medicine.stock || 0),
              status: 'Stock',
              user_email: user.email
            };
            
            console.log("Sending medicine data:", medicineData);
            
            // Use FormData for multipart/form-data
            const formData = new FormData();
            
            // Append all fields as strings
            Object.entries(medicineData).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                formData.append(key, value.toString());
              }
            });
            
            const response = await axios.post("http://localhost:8080/api/medicines", formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            
            console.log("✅ Import successful:", response.data);
            successCount++;
            
          } catch (error) {
            console.error(`❌ Error importing medicine:`, error);
            console.error("Full error:", error.response?.data);
            errorCount++;
          }
        }
        
        alert(`Import completed: ${successCount} successful, ${errorCount} failed.`);
        setShowImportModal(false);
        setImportFile(null);
        
        // Refresh the list
        await fetchMedicines();
      };
      
      if (importFile.name.endsWith('.csv')) {
        reader.readAsText(importFile);
      } else if (importFile.name.endsWith('.json')) {
        reader.readAsText(importFile);
      }
    } catch (error) {
      console.error("Error during import:", error);
      alert(`Error importing file: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleExportSubmit = () => {
    const dataToExport = [...inventoryData];
    
    let content, mimeType, extension;
    
    if (exportFormat === 'csv') {
      content = convertToCSV(dataToExport);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else if (exportFormat === 'json') {
      content = convertToJSON(dataToExport);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
    } else if (exportFormat === 'excel') {
      // For Excel, we'll use CSV with .xlsx extension
      content = convertToCSV(dataToExport);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;';
      extension = 'xlsx';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const user = getUserData();
    const emailPrefix = user?.email ? user.email.split('@')[0] : 'inventory';
    const date = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.download = `${emailPrefix}_inventory_${date}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
  };

  // Add this function to your Inventory component
  const checkIfImageExists = async (imageUrl) => {
    try {
      console.log('🔍 Checking if image exists:', imageUrl);
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log('✅ Image check response:', response.status, response.ok);
      return response.ok;
    } catch (error) {
      console.error('❌ Image check error:', error);
      return false;
    }
  };

  // Use it in your component
  useEffect(() => {
    // Debug: Check all images on load
    inventoryData.forEach(async (medicine) => {
      if (medicine.image) {
        const imageUrl = getImageUrl(medicine.image);
        if (imageUrl && !imageUrl.startsWith('blob:')) {
          const exists = await checkIfImageExists(imageUrl);
          console.log(`🖼️ ${medicine.name}: ${imageUrl} - ${exists ? '✅ Found' : '❌ Missing'}`);
        }
      }
    });
  }, [inventoryData]);

  const getImageUrl = (imagePath) => {
    if (!imagePath || 
        imagePath === 'No image' || 
        imagePath === 'NULL' || 
        imagePath === 'null' ||
        imagePath === '' ||
        imagePath === undefined) {
      console.log('⚠️ No image path provided');
      return null;
    }
    
    console.log('🖼️ Processing image path:', imagePath);
    
    // Already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Blob URL for previews
    if (imagePath.startsWith('blob:')) {
      return imagePath;
    }
    
    const baseUrl = 'http://localhost:8080';
    
    let cleanPath = imagePath;
    
    if (cleanPath.includes('?')) {
      cleanPath = cleanPath.split('?')[0];
    }

    let encodedPath = encodeURI(cleanPath);
    
    const cacheBuster = `?t=${Date.now()}`;

    const possiblePaths = [];
    
    if (cleanPath.startsWith('/uploads/')) {
      possiblePaths.push(encodedPath + cacheBuster);
      possiblePaths.push(encodedPath);
      possiblePaths.push(encodedPath.replace('/uploads/', '/uploads/invoices/') + cacheBuster);
    } else {
      possiblePaths.push(`/uploads/invoices/${encodedPath}` + cacheBuster);
      possiblePaths.push(`/uploads/${encodedPath}` + cacheBuster);
      possiblePaths.push(`/${encodedPath}` + cacheBuster);
    }

    const uniquePaths = [...new Set(possiblePaths.filter(path => path && path.trim() !== ''))];
    
    console.log('🔍 Testing possible paths:', uniquePaths);

    for (const path of uniquePaths) {
      const url = `${baseUrl}${path}`;
      console.log('   → Trying:', url);
      return url;
    }
    
    console.warn('⚠️ No valid image URL could be constructed for:', imagePath);
    return null;
  };

  const getStockStatus = (stockQty) => {
    if (stockQty < 100) {
      return { status: "Low Stock", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" };
    } else if (stockQty >= 100 && stockQty <= 200) {
      return { status: "Medium Stock", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" };
    } else {
      return { status: "High Stock", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" };
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

  const filterByStockStatus = (medicine) => {
    if (selectedStockFilter === 'all') return true;
    if (selectedStockFilter === 'low' && medicine.stock_qty < 100) return true;
    if (selectedStockFilter === 'medium' && medicine.stock_qty >= 100 && medicine.stock_qty <= 200) return true;
    if (selectedStockFilter === 'high' && medicine.stock_qty > 200) return true;
    return false;
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
    setMedicines(prev => 
      prev.map(medicine => 
        medicine.id === id 
          ? { ...medicine, [field]: value }
          : medicine
      )
    );
  };

  // Add this useEffect to debug the data
  useEffect(() => {
    console.log('📊 Current inventory data:', inventoryData);
    console.log('✏️ Editing rows:', Array.from(editingRows));
    console.log('🔄 Updating rows:', Array.from(updatingRows));
  }, [inventoryData, editingRows, updatingRows]);

  const handleExistingImageUpload = (id, file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("❌ Image size should be less than 2MB");
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      
      // Update local state immediately for preview
      handleMedicineUpdate(id, 'imagePreview', imageUrl);
      
      // Find the medicine and update it immediately with the image file
      const medicine = inventoryData.find(med => med.id === id);
      if (medicine) {
        // Update the medicine with the image file
        const updatedMedicine = { ...medicine, imageFile: file, imagePreview: imageUrl };
        // Call update function immediately
        handleUpdateMedicine(updatedMedicine);
      }
      
      console.log("Image uploaded for medicine:", id);
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

  const handleUpdateMedicine = async (medicine, imageFile = null) => {
    try {
      setUpdatingRows(prev => new Set(prev).add(medicine.id));
      
      console.log('📝 Preparing to update medicine:', medicine);
      console.log('🖼️ Image file for update:', imageFile);
      
      // Prepare the update data
      const updateData = {
        sku: medicine.sku || '',
        name: medicine.name || '',
        description: medicine.description || '',
        unit: medicine.unit || 'pcs',
        unit_price: medicine.unit_price || 0,
        tax_rate: medicine.tax_rate || 0,
        mfg_date: medicine.mfg_date || new Date().toISOString().split('T')[0],
        expiry_date: medicine.expiry_date || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: medicine.category || '',
        stock_qty: medicine.stock_qty || 0,
        status: medicine.status || 'Stock'
      };
      
      console.log('📤 Sending update data:', updateData);
      
      // Call the hook function with the image file
      const response = await updateMedicine(medicine.id, updateData, imageFile);
      
      console.log('✅ Update response:', response);
      
      // Force a refresh of medicines data
      await fetchMedicines();
      
      // Remove from editing set
      const newEditingRows = new Set(editingRows);
      newEditingRows.delete(medicine.id);
      setEditingRows(newEditingRows);
      
      // Clear any cached image preview
      if (medicine.imagePreview && medicine.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(medicine.imagePreview);
      }
      
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
    sessionStorage.removeItem('userData');
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
    
    // Apply stock filter
    if (selectedStockFilter !== 'all') {
      data = data.filter(filterByStockStatus);
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
  }, [inventoryData, searchQuery, selectedCategory, selectedStockFilter, sortBy, sortOrder]);

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
              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          );
        case "date":
          return (
            <input
              type="date"
              value={formatDateForInput(medicine[field])}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          );
        default:
          return (
            <input
              type="text"
              value={medicine[field] || ""}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

    const handleStockButtonClick = () => {
      if (!isNew && !isEditing) {
        setSelectedMedicineForStock(medicine);
        setStockAdjustmentType('add');
        setStockAdjustmentValue('');
        setShowStockModal(true);
      }
    };

    // Get stock status icon and color
    const getStockStatusIcon = () => {
      if (medicine.stock_qty < 100) {
        return <TrendingDown size={12} className="text-red-500" />;
      } else if (medicine.stock_qty >= 100 && medicine.stock_qty <= 200) {
        return <Minus size={12} className="text-yellow-500" />;
      } else {
        return <TrendingUp size={12} className="text-green-500" />;
      }
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold text-sm truncate">{medicine.name || "New Medicine"}</h3>
            <p className="text-gray-500 text-xs">{medicine.sku}</p>
          </div>
          {editMode && (
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedRows.has(medicine.id)}
                onChange={() => handleSelectRow(medicine.id)}
                className="border-gray-300 bg-white text-blue-600 focus:ring-blue-500 rounded"
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
                    className="mt-1 w-12 h-12 object-cover rounded border border-gray-300"
                  />
                )}
              </div>
            ) : (
              getImageUrl(medicine.image) ? (
                <img
                  src={getImageUrl(medicine.image)}
                  alt={medicine.name}
                  className="w-12 h-12 object-cover rounded border border-gray-300"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", medicine.image);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No Image</span>
                </div>
              )
            )}
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Price:</span>
                <div className="text-gray-800">
                  {isNew ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={medicine.unit_price}
                      onChange={(e) => handleNewRowUpdate(medicine.id, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 bg-white rounded text-gray-800 text-xs"
                      placeholder="0.00"
                    />
                  ) : (
                    renderEditableField(medicine, 'unit_price', 'number')
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Stock:</span>
                <div className="text-gray-800">
                  {isNew ? (
                    <input
                      type="number"
                      min="0"
                      value={medicine.stock_qty}
                      onChange={(e) => handleNewRowUpdate(medicine.id, "stock_qty", parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 bg-white rounded text-gray-800 text-xs"
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
          <button
            onClick={handleStockButtonClick}
            disabled={isNew || isEditing}
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1 border transition-all ${
              isNew || isEditing 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:opacity-80'
            } ${stockStatus.bgColor} ${stockStatus.borderColor} ${stockStatus.color}`}
          >
            {getStockStatusIcon()}
            {stockStatus.status}
          </button>
          <span className="text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded">
            {medicine.category || "Uncategorized"}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <span className="text-gray-500">MFG:</span>
            <div className="text-gray-800">
              {isNew ? (
                <input
                  type="date"
                  value={formatDateForInput(medicine.mfg_date)}
                  onChange={(e) => handleNewRowUpdate(medicine.id, "mfg_date", e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 bg-white rounded text-gray-800 text-xs"
                />
              ) : (
                renderEditableField(medicine, 'mfg_date', 'date')
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Expiry:</span>
            <div className="text-gray-800">
              {isNew ? (
                <input
                  type="date"
                  value={formatDateForInput(medicine.expiry_date)}
                  onChange={(e) => handleNewRowUpdate(medicine.id, "expiry_date", e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 bg-white rounded text-gray-800 text-xs"
                />
              ) : (
                renderEditableField(medicine, 'expiry_date', 'date')
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {editMode && (
          <div className="flex space-x-2 pt-2 border-t border-gray-200">
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
                  onClick={handleStockButtonClick}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-white text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  {getStockStatusIcon()}
                  Stock
                </button>
                
                {/* Edit Button */}
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

  // Add stock adjustment handler
  const handleStockAdjustment = async () => {
    if (!selectedMedicineForStock || !stockAdjustmentValue) return;
    
    try {
      setAdjustingStock(true);
      
      const adjustment = parseFloat(stockAdjustmentValue);
      if (isNaN(adjustment) || adjustment <= 0) {
        alert("Please enter a valid positive number");
        return;
      }
      
      let newStockQty;
      if (stockAdjustmentType === 'add') {
        newStockQty = selectedMedicineForStock.stock_qty + adjustment;
      } else {
        newStockQty = selectedMedicineForStock.stock_qty - adjustment;
        if (newStockQty < 0) {
          alert("Cannot reduce stock below 0");
          return;
        }
      }
      
      // Update the medicine with new stock quantity
      await updateMedicine(selectedMedicineForStock.id, {
        ...selectedMedicineForStock,
        stock_qty: newStockQty
      });
      
      // Refresh medicines
      await fetchMedicines();
      
      // Close modal and reset
      setShowStockModal(false);
      setSelectedMedicineForStock(null);
      setStockAdjustmentValue('');
      setStockAdjustmentType('add');
      
      alert(`✅ Stock ${stockAdjustmentType === 'add' ? 'added' : 'reduced'} successfully! New stock: ${newStockQty}`);
      
    } catch (error) {
      console.error("❌ Error adjusting stock:", error);
      alert("❌ Failed to adjust stock. Please try again.");
    } finally {
      setAdjustingStock(false);
    }
  };

  // Mobile Sidebar Component
  const MobileSidebar = () => {
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

    const getActiveItem = () => {
      const path = location.pathname;
      if (path.includes('/inventory')) return 'inventory';
      if (path.includes('/orders')) return 'orders';
      if (path.includes('/invoices')) return 'invoices';
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
          "bg-white border-r border-gray-200 flex flex-col h-full transition-transform duration-300",
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
              <span className="text-xl font-semibold text-gray-800">MediVerse</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
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
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
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

          {/* Logout */}
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
      </>
    );
  };

  // Desktop Sidebar Component
  const DesktopSidebar = () => {
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

    const getActiveItem = () => {
      const path = location.pathname;
      if (path.includes('/inventory')) return 'inventory';
      if (path.includes('/orders')) return 'orders';
      if (path.includes('/dispatch')) return 'dispatch';
      if (path.includes('/invoices')) return 'invoices';
      if (path.includes('/reports')) return 'reports';
      if (path.includes('/dashboard')) return 'dashboard';
      return 'inventory';
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

    return (
      <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="MediVerse Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-semibold text-gray-800">MediVerse</span>
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
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

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

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStockFilter && !event.target.closest('.relative')) {
        setShowStockFilter(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStockFilter]);

  return (
    <div className="flex h-screen bg-white text-gray-800 relative">
      {isMobileView ? <MobileSidebar /> : <DesktopSidebar />}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with mobile menu button */}
        <header className="bg-white text-gray-800 border-b border-gray-200 px-4 lg:px-6 py-4 lg:py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            {isMobileView && (
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Inventory Management</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Import/Export buttons */}
            <button
              onClick={handleImportClick}
              className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={handleExportClick}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <button
              onClick={handleAddMedicine}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 text-sm"
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
        <div className="p-3 lg:p-4 border-b border-gray-200 bg-white">
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg w-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filters Toggle for Mobile */}
          <div className="flex flex-wrap gap-2 items-center">
            {isMobileView && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-gray-700 text-sm flex items-center gap-2"
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
                className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full lg:w-40"
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
                  className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full lg:w-32"
                >
                  <option value="name">Name</option>
                  <option value="sku">SKU</option>
                  <option value="price">Price</option>
                  <option value="stock">Stock</option>
                </select>
                
                <button
                  onClick={() => handleSortChange(sortBy)}
                  className={`px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors text-sm ${
                    sortOrder === 'asc' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Edit button moved here */}
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-2 border rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                  editMode
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {editMode ? <Save size={14} /> : <Edit size={14} />}
                {editMode ? 'Done' : 'Edit'}
              </button>

              {editMode && selectedRows.size > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-red-700">{selectedRows.size} selected</span>
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
          
          <div className="relative mt-2">
            <button
              onClick={() => setShowStockFilter(!showStockFilter)}
              className={`px-3 py-2 border rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedStockFilter !== 'all'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {selectedStockFilter === 'all' && <BarChart3 size={14} />}
              {selectedStockFilter === 'low' && <TrendingDown size={14} className="text-red-500" />}
              {selectedStockFilter === 'medium' && <Minus size={14} className="text-yellow-500" />}
              {selectedStockFilter === 'high' && <TrendingUp size={14} className="text-green-500" />}
              {selectedStockFilter === 'all' ? 'Stock' : selectedStockFilter === 'low' ? 'Low Stock' : selectedStockFilter === 'medium' ? 'Medium Stock' : 'High Stock'}
            </button>
            
            {/* Stock Filter Dropdown */}
            {showStockFilter && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Filter by Stock</div>
                  
                  <button
                    onClick={() => {
                      setSelectedStockFilter('all');
                      setShowStockFilter(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm mb-1 ${
                      selectedStockFilter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Stock</span>
                    <BarChart3 size={14} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedStockFilter('low');
                      setShowStockFilter(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm mb-1 ${
                      selectedStockFilter === 'low'
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Low Stock</span>
                    </div>
                    <TrendingDown size={14} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedStockFilter('medium');
                      setShowStockFilter(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm mb-1 ${
                      selectedStockFilter === 'medium'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Medium Stock</span>
                    </div>
                    <Minus size={14} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedStockFilter('high');
                      setShowStockFilter(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                      selectedStockFilter === 'high'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>High Stock</span>
                    </div>
                    <TrendingUp size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden bg-white p-3 lg:p-4">
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
                  <div className="text-gray-300 text-6xl mb-4">💊</div>
                  <p className="text-gray-600 text-lg mb-2">No medicines found.</p>
                  <p className="text-gray-400 text-sm">Click "Add Medicine" to get started.</p>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Table View - COMPACT VERSION */
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col shadow-sm">
              <div className="overflow-auto flex-1">
                <table className="w-full min-w-max">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="sticky top-0 bg-white border-b border-gray-200">
                      {editMode && (
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-8">
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={
                              selectedRows.size === visibleData.length + newRows.length &&
                              (visibleData.length + newRows.length) > 0
                            }
                            className="border-gray-300 bg-white text-blue-600 focus:ring-blue-500 rounded h-4 w-4"
                          />
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-24">SKU</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-20">Image</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-40">Medicine</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-32">Desc</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-20">Unit</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-24">Price</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-20">Tax</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-28">MFG Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-28">Expiry</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-32">Category</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white border-r border-gray-200 w-24">Stock</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white w-28">Status</th>
                      {editMode && (
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-white w-32">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {newRows.map((row) => {
                      const stockStatus = getStockStatus(row.stock_qty);
                      return (
                        <tr key={row.id} className="hover:bg-blue-50 transition-colors bg-blue-50">
                          {editMode && (
                            <td className="px-2 py-3 whitespace-nowrap border-r border-gray-200">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(row.id)}
                                onChange={() => handleSelectRow(row.id)}
                                className="border-gray-300 bg-white text-blue-600 focus:ring-blue-500 rounded h-4 w-4"
                              />
                            </td>
                          )}
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(e) => handleNewRowUpdate(row.id, "sku", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="SKU"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <div className="flex flex-col items-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(row.id, e.target.files[0])}
                                className="w-full text-xs"
                              />
                              {row.imagePreview && (
                                <img
                                  src={row.imagePreview}
                                  alt="preview"
                                  className="mt-1 w-12 h-12 object-cover rounded border border-gray-300"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <input
                              type="text"
                              placeholder="Medicine name"
                              value={row.name}
                              onChange={(e) => handleNewRowUpdate(row.id, "name", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200">
                            <input
                              type="text"
                              placeholder="Description"
                              value={row.description}
                              onChange={(e) => handleNewRowUpdate(row.id, "description", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <select
                              value={row.unit}
                              onChange={(e) => handleNewRowUpdate(row.id, "unit", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Unit</option>
                              {getCategoryUnits(row.category).map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.unit_price}
                                onChange={(e) => handleNewRowUpdate(row.id, "unit_price", parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={row.tax_rate}
                                onChange={(e) => handleNewRowUpdate(row.id, "tax_rate", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0.0"
                              />
                              <span className="text-gray-500 text-xs">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <input
                              type="date"
                              value={formatDateForInput(row.mfg_date)}
                              onChange={(e) => handleNewRowUpdate(row.id, "mfg_date", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <input
                              type="date"
                              value={formatDateForInput(row.expiry_date)}
                              onChange={(e) => handleNewRowUpdate(row.id, "expiry_date", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <select
                              value={row.category}
                              onChange={(e) => {
                                handleNewRowUpdate(row.id, "category", e.target.value);
                                handleNewRowUpdate(row.id, "unit", "");
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Category</option>
                              {categoryOptions.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            <input
                              type="number"
                              min="0"
                              value={row.stock_qty}
                              onChange={(e) => handleNewRowUpdate(row.id, "stock_qty", parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.borderColor} border ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                          </td>
                          {editMode && (
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleSaveNewRow(row)}
                                  disabled={saving}
                                  className={`bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1 transition-colors ${
                                    saving ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {saving ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </>
                                  ) : (
                                    <>
                                      <Save size={12} />
                                      Save
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRemoveNewRow(row.id)}
                                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1 transition-colors"
                                >
                                  <X size={12} />
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
                        <tr key={medicine.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                          {editMode && (
                            <td className="px-2 py-3 whitespace-nowrap border-r border-gray-200">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(medicine.id)}
                                onChange={() => handleSelectRow(medicine.id)}
                                className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                            </td>
                          )}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'sku', 'text')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                            {isEditing ? (
                              <div className="flex flex-col items-center">
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`image-upload-${medicine.id}`}
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleExistingImageUpload(medicine.id, file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`image-upload-${medicine.id}`}
                                    className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-colors"
                                  >
                                    <Upload size={10} />
                                    Change
                                  </label>
                                </div>
                                
                                {(medicine.imagePreview || getImageUrl(medicine.image)) && (
                                  <img
                                    src={medicine.imagePreview || getImageUrl(medicine.image)}
                                    alt="preview"
                                    className="mt-1 w-12 h-12 object-cover rounded border border-gray-300"
                                  />
                                )}
                              </div>
                            ) : (
                              getImageUrl(medicine.image) ? (
                                <div className="flex justify-center">
                                  <img
                                    src={getImageUrl(medicine.image)}
                                    alt={medicine.name}
                                    className="w-12 h-12 object-cover rounded border border-gray-300"
                                    onError={(e) => {
                                      console.error("❌ Image failed to load:", medicine.image);
                                      e.target.style.display = 'none';
                                      e.target.parentElement.innerHTML = `
                                        <div class="w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                                          <span class="text-gray-400 text-xs">No Image</span>
                                        </div>
                                      `;
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No Image</span>
                                </div>
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'name', 'text')}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 border-r border-gray-200 max-w-xs truncate">
                            {renderEditableField(medicine, 'description', 'text')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {isEditing ? (
                              <select
                                value={medicine.unit || ""}
                                onChange={(e) => handleMedicineUpdate(medicine.id, 'unit', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Unit</option>
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
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'unit_price', 'number')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={medicine.tax_rate || 0}
                                  onChange={(e) => handleMedicineUpdate(medicine.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-gray-500 text-xs">%</span>
                              </div>
                            ) : (
                              `${medicine.tax_rate || 0}%`
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'mfg_date', 'date')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'expiry_date', 'date')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {isEditing ? (
                              <select
                                value={medicine.category || ""}
                                onChange={(e) => {
                                  handleMedicineUpdate(medicine.id, 'category', e.target.value);
                                  handleMedicineUpdate(medicine.id, 'unit', "");
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 bg-white rounded text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Category</option>
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
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800 border-r border-gray-200">
                            {renderEditableField(medicine, 'stock_qty', 'number')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.borderColor} border ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                          </td>
                          {editMode && (
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex space-x-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateMedicine(medicine)}
                                      disabled={isUpdating}
                                      className={`bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1 transition-colors ${
                                        isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      {isUpdating ? (
                                        <>
                                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1"
                                    >
                                      <X size={12} />
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedMedicineForStock(medicine);
                                        setStockAdjustmentType('add');
                                        setStockAdjustmentValue('');
                                        setShowStockModal(true);
                                      }}
                                      className={`px-2 py-1 rounded text-white text-xs flex items-center gap-1 ${
                                        medicine.stock_qty < 100 
                                          ? 'bg-red-600 hover:bg-red-700' 
                                          : medicine.stock_qty <= 200 
                                            ? 'bg-yellow-600 hover:bg-yellow-700' 
                                            : 'bg-green-600 hover:bg-green-700'
                                      }`}
                                    >
                                      Stock
                                    </button>
                                    <button
                                      onClick={() => handleEditRow(medicine.id)}
                                      className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1"
                                    >
                                      <Edit size={12} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMedicine(medicine.id)}
                                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-xs flex items-center gap-1"
                                    >
                                      <Trash2 size={12} />
                                      Del
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
                        <td colSpan={editMode ? "14" : "13"} className="px-6 py-12 text-center">
                          <div className="text-gray-300 text-4xl mb-4">💊</div>
                          <p className="text-gray-600 text-sm mb-2">No medicines found.</p>
                          <p className="text-gray-400 text-xs">Click "Add Medicine" to get started.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredData.length > itemsPerPage && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Showing {visibleData.length} of {filteredData.length} medicines
                      {newRows.length > 0 && ` + ${newRows.length} new`}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded">
                        Page {currentPage} of {Math.ceil(filteredData.length / itemsPerPage)}
                      </span>
                      <button
                        disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredData.length / itemsPerPage), prev + 1))}
                        className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Medicines</h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload a CSV or JSON file
              </p>
              <div className="mb-4">
                <input
                  type="file"
                  accept=".csv,.json,.xlsx"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Supported formats: CSV, JSON
                </p>
              </div>
              
              {importFile && (
                <div className="mb-4 p-2 bg-gray-50 rounded">
                  <p className="text-gray-800 text-sm">Selected file: {importFile.name}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 text-sm"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm flex items-center gap-2"
                  disabled={importing || !importFile}
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Medicines</h3>
              <p className="text-gray-600 text-sm mb-4">
                Export your inventory data in your preferred format.
              </p>
              
              <div className="mb-4">
                <label className="block text-gray-600 text-sm mb-2">Export Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm"
                >
                  <option value="csv">CSV (Comma Separated Values)</option>
                  <option value="json">JSON (JavaScript Object Notation)</option>
                  <option value="excel">Excel Spreadsheet</option>
                </select>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-gray-800 text-sm">
                  Exporting {inventoryData.length} medicines
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Stock Adjustment Modal */}
      {showStockModal && selectedMedicineForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Adjust Stock - {selectedMedicineForStock.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                SKU: {selectedMedicineForStock.sku} | 
                Current Stock: <span className={`font-bold ${
                  selectedMedicineForStock.stock_qty < 100 ? 'text-red-600' : 
                  selectedMedicineForStock.stock_qty <= 200 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {selectedMedicineForStock.stock_qty}
                </span>
              </p>
              
              <div className="mb-4">
                <label className="block text-gray-600 text-sm mb-2">Adjustment Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStockAdjustmentType('add')}
                    className={`flex-1 px-4 py-2 rounded flex items-center justify-center gap-2 ${
                      stockAdjustmentType === 'add' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Plus size={14} />
                    Add Stock
                  </button>
                  <button
                    onClick={() => setStockAdjustmentType('subtract')}
                    className={`flex-1 px-4 py-2 rounded flex items-center justify-center gap-2 ${
                      stockAdjustmentType === 'subtract' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Minus size={14} />
                    Reduce Stock
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-600 text-sm mb-2">
                  {stockAdjustmentType === 'add' ? 'Quantity to Add' : 'Quantity to Reduce'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockAdjustmentValue}
                  onChange={(e) => setStockAdjustmentValue(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {stockAdjustmentValue && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-gray-800 text-sm">
                    Current: <span className="font-bold">{selectedMedicineForStock.stock_qty}</span>
                    <br />
                    {stockAdjustmentType === 'add' ? '+' : '-'} {stockAdjustmentValue} = 
                    <span className={`font-bold ml-2 ${
                      (stockAdjustmentType === 'add' 
                        ? selectedMedicineForStock.stock_qty + parseFloat(stockAdjustmentValue) 
                        : selectedMedicineForStock.stock_qty - parseFloat(stockAdjustmentValue)
                      ) < 100 ? 'text-red-600' : 
                      (stockAdjustmentType === 'add' 
                        ? selectedMedicineForStock.stock_qty + parseFloat(stockAdjustmentValue) 
                        : selectedMedicineForStock.stock_qty - parseFloat(stockAdjustmentValue)
                      ) <= 200 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {stockAdjustmentType === 'add' 
                        ? selectedMedicineForStock.stock_qty + parseFloat(stockAdjustmentValue)
                        : selectedMedicineForStock.stock_qty - parseFloat(stockAdjustmentValue)
                      }
                    </span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Status will be: {
                      getStockStatus(
                        stockAdjustmentType === 'add' 
                          ? selectedMedicineForStock.stock_qty + parseFloat(stockAdjustmentValue)
                          : selectedMedicineForStock.stock_qty - parseFloat(stockAdjustmentValue)
                      ).status
                    }
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowStockModal(false);
                    setSelectedMedicineForStock(null);
                    setStockAdjustmentValue('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 text-sm"
                  disabled={adjustingStock}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockAdjustment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
                  disabled={adjustingStock || !stockAdjustmentValue}
                >
                  {adjustingStock ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Update Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the component wrapped with MobileMenuProvider
const InventoryWithProvider = () => (
  <MobileMenuProvider>
    <Inventory />
  </MobileMenuProvider>
);

export default InventoryWithProvider;