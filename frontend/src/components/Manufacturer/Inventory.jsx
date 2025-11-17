import React, { useState, useMemo, useEffect, useRef } from "react";
import { LayoutDashboard, Package, ShoppingCart, Truck, BarChart3, Settings, LogOut, Edit, Save, X, Plus, Trash2, ClipboardList, FileText, Mail, Ship, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import axios from "axios";

const cn = (...classes) => classes.filter(Boolean).join(' ');

// Date formatting utility functions
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle ISO date strings like "2025-11-07T18:30:00.000Z"
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    // Format as YYYY-MM-DD for date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

const formatDateForBackend = (dateString) => {
  if (!dateString) return '';
  
  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle ISO date strings
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    // Format as YYYY-MM-DD for backend
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for backend:', error);
    return '';
  }
};

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [inventoryData, setInventoryData] = useState([]);
  const [newRows, setNewRows] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingRows, setEditingRows] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingRows, setUpdatingRows] = useState(new Set());

  const skuCounterRef = useRef(1);

  const MEDICINES_API = "http://localhost:8080/api/medicines";
  const COMPANY_API = "http://localhost:8080/api/check-company";

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await axios.get(MEDICINES_API);
      console.log("Fetched medicines:", response.data);
      setInventoryData(response.data);
      
      if (response.data.length > 0) {
        const maxSku = response.data.reduce((max, item) => {
          const match = item.sku?.match(/\d+/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        skuCounterRef.current = maxSku + 1;
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
      alert("Failed to fetch medicines from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

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

    // Use YYYY-MM-DD format directly
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

// UPDATED handleUpdateMedicine function - FIXED VERSION
const handleUpdateMedicine = async (medicine) => {
  try {
    setUpdatingRows(prev => new Set(prev).add(medicine.id));
    
    const user = getUserData();
    if (!user || !user.email) {
      alert("❌ User email not found. Please log in again.");
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicine.id);
        return newSet;
      });
      return;
    }

    // Enhanced validation
    if (!medicine.name?.trim()) {
      alert("❌ Medicine name is required.");
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicine.id);
        return newSet;
      });
      return;
    }

    if (!medicine.sku?.trim()) {
      alert("❌ SKU is required.");
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicine.id);
        return newSet;
      });
      return;
    }

    if (medicine.stock_qty < 0) {
      alert("❌ Stock quantity cannot be negative.");
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicine.id);
        return newSet;
      });
      return;
    }

    console.log("🔄 Starting to update medicine:", medicine);

    // Prepare the data with proper formatting
    const updateData = {
      sku: medicine.sku.trim(),
      name: medicine.name.trim(),
      description: medicine.description?.trim() || "",
      unit: medicine.unit || "",
      unit_price: medicine.unit_price ? parseFloat(medicine.unit_price) : 0,
      tax_rate: medicine.tax_rate ? parseFloat(medicine.tax_rate) : 0,
      mfg_date: formatDateForInput(medicine.mfg_date) || new Date().toISOString().split('T')[0],
      expiry_date: formatDateForInput(medicine.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      category: medicine.category || "health devices",
      stock_qty: medicine.stock_qty ? parseInt(medicine.stock_qty) : 0,
      status: "Stock",
      user_email: user.email
    };

    console.log("📤 Prepared update data:", updateData);

    // Check if we have an image to upload
    const hasNewImage = medicine.image instanceof File;

    let response;

    if (hasNewImage) {
      console.log("🖼️ Has new image, using FormData");
      // Use FormData for image upload
      const formData = new FormData();
      
      // Append all fields to FormData
      Object.entries(updateData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      // Append the image file
      formData.append("image", medicine.image);

      // Log FormData contents for debugging
      console.log("📝 FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }

      response = await axios.put(
        `${MEDICINES_API}/${medicine.id}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        }
      );

    } else {
      console.log("📄 No new image, using URLSearchParams for better compatibility");
      // Use URLSearchParams which is more compatible with form parsing
      const urlParams = new URLSearchParams();
      
      Object.entries(updateData).forEach(([key, value]) => {
        urlParams.append(key, value.toString());
      });

      console.log("🔗 URLSearchParams:", urlParams.toString());

      response = await axios.put(
        `${MEDICINES_API}/${medicine.id}`, 
        urlParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );
    }

    console.log("✅ Update successful:", response.data);

    // Update local state
    setInventoryData(prev => prev.map(item => 
      item.id === medicine.id ? { ...item, ...response.data } : item
    ));

    // Remove from editing set
    const newEditingRows = new Set(editingRows);
    newEditingRows.delete(medicine.id);
    setEditingRows(newEditingRows);

    alert("✅ Medicine updated successfully!");

  } catch (error) {
    console.error("❌ Error updating medicine:", error);
    
    if (error.response) {
      console.error("📊 Response status:", error.response.status);
      console.error("📊 Response data:", error.response.data);
      
      let errorMessage = "Server error";
      
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          // Try to extract the error message from HTML response
          const match = error.response.data.match(/<pre>([^<]+)</);
          if (match) {
            errorMessage = match[1].trim();
          } else {
            errorMessage = error.response.data;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      alert(`❌ Failed to update medicine: ${errorMessage}`);
    } else if (error.request) {
      console.error("📊 No response received:", error.request);
      alert("❌ No response from server. Please check if the server is running.");
    } else {
      console.error("📊 Request setup error:", error.message);
      alert(`❌ Failed to update medicine: ${error.message}`);
    }
  } finally {
    setUpdatingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(medicine.id);
      return newSet;
    });
  }
};

  const handleMedicineUpdate = (id, field, value) => {
    setInventoryData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleExistingImageUpload = (id, file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("❌ Image size should be less than 2MB");
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      setInventoryData(prev => 
        prev.map(item => 
          item.id === id ? { ...item, image: file, imagePreview: imageUrl } : item
        )
      );
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
        const formData = new FormData();

        if (row.image instanceof File) {
          formData.append("image", row.image);
        }

        const fieldsToAppend = {
          sku: row.sku || "",
          name: row.name || "",
          description: row.description || "",
          unit: row.unit || "",
          unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
          tax_rate: row.tax_rate ? parseFloat(row.tax_rate) : 0,
          mfg_date: formatDateForBackend(row.mfg_date) || new Date().toISOString().split('T')[0],
          expiry_date: formatDateForBackend(row.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
          category: row.category || "",
          stock_qty: row.stock_qty ? parseInt(row.stock_qty) : 0,
          status: row.status || "Stock",
          user_email: user.email
        };

        Object.entries(fieldsToAppend).forEach(([key, value]) => {
          formData.append(key, value.toString());
        });

        return await axios.post(MEDICINES_API, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      const responses = await Promise.all(savePromises);
      const savedMedicines = responses.map((res) => res.data);
      setInventoryData((prev) => [...prev, ...savedMedicines]);
      setNewRows([]);
      alert(`✅ ${savedMedicines.length} medicines saved successfully!`);
    } catch (error) {
      console.error("Error saving medicines:", error);
      if (error.response) {
        alert("❌ Failed to save some medicines: " + (error.response.data?.message || error.response.data));
      } else {
        alert("❌ Failed to save some medicines.");
      }
    }
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

  useEffect(() => {
    return () => {
      newRows.forEach(row => {
        if (row.imagePreview && row.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(row.imagePreview);
        }
      });
      inventoryData.forEach(medicine => {
        if (medicine.imagePreview && medicine.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(medicine.imagePreview);
        }
      });
    };
  }, [newRows, inventoryData]);

 const getUserData = () => {
  try {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    console.log("📋 Raw user data from storage:", userData);
    
    if (!userData) {
      console.log("❌ No user data found in storage");
      return null;
    }
    
    const parsedData = JSON.parse(userData);
    console.log("📋 Parsed user data:", parsedData);
    
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
// Add this function to test backend FormData handling
const testBackendFormDataSupport = async () => {
  try {
    console.log("🔍 Testing backend FormData support...");
    
    const testFormData = new FormData();
    testFormData.append('test_field', 'test_value');
    
    const response = await axios.post(`${MEDICINES_API}/test`, testFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    console.log("✅ Backend supports FormData");
    return true;
  } catch (error) {
    console.log("❌ Backend may not support FormData properly");
    return false;
  }
};
// Add this function to test the API connection
const testApiConnection = async () => {
  try {
    console.log("🔍 Testing API connection...");
    const response = await axios.get(MEDICINES_API);
    console.log("✅ API connection successful:", response.status);
    return true;
  } catch (error) {
    console.error("❌ API connection failed:", error);
    return false;
  }
};
// Call this in your component or useEffect to test
useEffect(() => {
  testApiConnection();
}, []);

  const handleSaveNewRow = async (row) => {
    try {
      setSaving(true);
      
      const user = getUserData();
      
      if (!user || !user.email) {
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
        alert("❌ Please complete company verification before adding medicines. Go to your dashboard to verify your company.");
        return;
      }

      const formData = new FormData();
      
      if (row.image instanceof File) {
        formData.append("image", row.image);
      }
      
      const fieldsToAppend = {
        sku: row.sku || "",
        name: row.name || "",
        description: row.description || "",
        unit: row.unit || "",
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        tax_rate: row.tax_rate ? parseFloat(row.tax_rate) : 0,
        mfg_date: formatDateForBackend(row.mfg_date) || new Date().toISOString().split('T')[0],
        expiry_date: formatDateForBackend(row.expiry_date) || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        category: row.category || "",
        stock_qty: row.stock_qty ? parseInt(row.stock_qty) : 0,
        status: row.status || "Stock",
        user_email: user.email
      };

      Object.entries(fieldsToAppend).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await axios.post(MEDICINES_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      if (response.data && response.data.id) {
        let imageUrl = response.data.image;
        
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:')) {
          if (imageUrl.startsWith('/')) {
            imageUrl = `http://localhost:8080${imageUrl}`;
          } else {
            imageUrl = `http://localhost:8080/uploads/${imageUrl}`;
          }
        }
         
        const savedMedicine = {
          ...row,
          id: response.data.id,
          image: imageUrl,
          isNew: false
        };
        
        setInventoryData((prev) => [...prev, savedMedicine]);
        setNewRows((prev) => prev.filter((r) => r.id !== row.id));
        
        if (row.imagePreview && row.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(row.imagePreview);
        }
        
        alert("✅ Medicine saved successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error saving medicine:", error);
      
      if (error.code === 'ECONNABORTED') {
        alert("❌ Request timeout. The server is taking too long to respond.");
      } else if (error.response) {
        alert("❌ Failed to save medicine: " + (error.response.data?.message || error.response.data || error.message));
      } else if (error.request) {
        alert("❌ No response received from server. Please check if the server is running.");
      } else {
        alert("❌ Failed to save medicine: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNewRow = (id) => {
    setNewRows((prev) => prev.filter((r) => r.id !== id));
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

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedRows.size} selected medicines?`);
    if (!confirmDelete) return;

    try {
      const existingIds = Array.from(selectedRows).filter(id => !id.toString().startsWith('new-'));
      const deletePromises = existingIds.map(id => 
        axios.delete(`${MEDICINES_API}/${id}`)
      );
      
      await Promise.all(deletePromises);

      setInventoryData(prev => prev.filter(item => !selectedRows.has(item.id)));
      setNewRows(prev => prev.filter(row => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
      alert("✅ Selected medicines deleted successfully!");
    } catch (error) {
      console.error("Error deleting medicines:", error);
      alert("❌ Failed to delete some medicines.");
    }
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

  const handleDeleteMedicine = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this medicine?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${MEDICINES_API}/${id}`);
      setInventoryData(prev => prev.filter(item => item.id !== id));
      alert("✅ Medicine deleted successfully!");
    } catch (error) {
      console.error("Error deleting medicine:", error);
      alert("❌ Failed to delete medicine.");
    }
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

  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/dispatch')) return 'dispatch';
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

  const renderEditableField = (medicine, field, type = "text", options = []) => {
    if (editMode && editingRows.has(medicine.id)) {
      switch (type) {
        case "select":
          return (
            <select
              value={medicine[field] || ""}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          );
        case "date":
          return (
            <input
              type="date"
              value={formatDateForInput(medicine[field])}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          );
        default:
          return (
            <input
              type="text"
              value={medicine[field] || ""}
              onChange={(e) => handleMedicineUpdate(medicine.id, field, e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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

  return (
    <div className="flex h-screen bg-gray-900 text-white">
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 text-white border-b border-gray-700 px-6 py-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Inventory Management</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleAddMedicine}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Medicine
            </button>
            {newRows.length > 0 && (
              <>
                <button
                  onClick={handleSaveAll}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2"
                >
                  <Save size={18} />
                  Save All ({newRows.length})
                </button>
                <button
                  onClick={handleCancelAll}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2"
                >
                  <X size={18} />
                  Cancel All
                </button>
              </>
            )}
          </div>
        </header>

        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-gray-700 bg-gray-900 text-white">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-2/4">
            <div className="flex-1 ">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines..."
                className="px-8 py-2 mx-2 my-1 bg-gray-800/50 border border-gray-700 rounded-lg w-full text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[180px]"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-700 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="name">Name</option>
                <option value="sku">SKU</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="category">Category</option>
                <option value="expiry">Expiry Date</option>
                <option value="status">Stock Status</option>
              </select>
              
              <button
                onClick={() => handleSortChange(sortBy)}
                className={`px-3 py-2 bg-gray-800/50 border border-gray-700 bg-gray-700 rounded text-sm text-white hover:bg-gray-600 transition-colors ${
                  sortOrder === 'asc' ? 'text-green-400' : 'text-red-400'
                }`}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                editMode
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800/50  border-gray-700  text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {editMode ? <Save size={16} /> : <Edit size={16} />}
              {editMode ? 'Done Editing' : 'Edit Mode'}
            </button>

            {editMode && selectedRows.size > 0 && (
              <div className="flex items-center gap-3 bg-red-600/20 border border-red-500/50 rounded-lg px-3 py-2">
                <span className="text-sm text-red-300">{selectedRows.size} selected</span>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-900 p-4">
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
        </div>
      </main>
    </div>
  );
};

export default Inventory;