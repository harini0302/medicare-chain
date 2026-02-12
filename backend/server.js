import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import bcrypt from 'bcryptjs'; 
import path from 'path';
import { fileURLToPath } from 'url';
import { sendOtpEmail } from './services/emailService.js';
import { sendInvoiceEmail } from './services/emailService.js';

// Load environment variables
dotenv.config();

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import InvoiceService from './services/invoiceService.js'; 

const app = express();
const server = http.createServer(app);


// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharma_supply_chain'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database');
  }
});


// Make db and io available to routes
app.use((req, res, next) => {
  req.db = db;
  req.io = io;
  next();
});
app.use('/api/invoices', invoiceRoutes);
// Create uploads directory
// In your server.js, check the upload directory
const uploadDir = './uploads';
console.log('📁 Upload directory path:', path.resolve(uploadDir));
console.log('📁 Upload directory exists:', fs.existsSync(path.resolve(uploadDir)));

// Make sure it's created
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created upload directory:', uploadDir);
}
// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });


// 🧾 Register User
app.post("/api/register", (req, res) => {
  const { fullName, email, phoneNumber, password, role } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "All fields required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const sqlCheck = "SELECT * FROM users WHERE email = ?";
  db.query(sqlCheck, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (results.length > 0) return res.status(400).json({ message: "User already exists" });

    const sqlInsert = "INSERT INTO users (fullName, email, phoneNumber, password, role) VALUES (?, ?, ?, ?, ?)";
    db.query(sqlInsert, [fullName, email, phoneNumber, hashedPassword, role], (err) => {
      if (err) return res.status(500).json({ message: "Registration failed" });
      res.status(201).json({ message: "✅ Registered successfully" });
    });
  });
});

// 🔐 Login User
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = results[0];

    // ✅ Check verification flag
    if (user.is_verified === 0) {
      return res.status(403).json({
        success: false,
        message: "Please verify your account first using the OTP sent to your email.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "✅ Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  });
});

// ✅ Company Verification Route (with file uploads AND OTP)
app.post("/api/verify-company", upload.fields([
  { name: "registrationCertificate", maxCount: 1 },
  { name: "businessIdProof", maxCount: 1 },
]), async (req, res) => {
  try {
    const {
      email,
      businessname,
      cinGstin,
      panGstNumber,
      businessAddress,
      state,
      country,
      zipCode,
      website
    } = req.body;

    const registrationCertificate = req.files?.registrationCertificate?.[0]?.filename || null;
    const businessIdProof = req.files?.businessIdProof?.[0]?.filename || null;

    console.log("Received verification data:", {
      email, businessname, cinGstin, panGstNumber
    });

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "No user email found. Please log in again." 
      });
    }

    // Validate required fields
    if (!businessname || !cinGstin || !panGstNumber || !businessAddress) {
      return res.status(400).json({ 
        success: false,
        message: "All required fields must be filled" 
      });
    }

    // First, save company verification data
    const sql = `
      INSERT INTO company_verification 
      (email, businessname, cinGstin, panGstNumber, businessAddress, state, country, zipCode, website, registrationCertificate, businessIdProof)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        email, businessname, cinGstin, panGstNumber, businessAddress, 
        state, country, zipCode, website, registrationCertificate, businessIdProof
      ],
      async (err, result) => {
        if (err) {
          console.error("Database insertion error:", err);
          return res.status(500).json({ 
            success: false,
            message: "Database insertion failed" 
          });
        }

        // Generate OTP and send email
        try {
          const otp = Math.floor(100000 + Math.random() * 900000);
          const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          
          const updateSql = "UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?";
          db.query(updateSql, [otp, expiry, email], async (updateErr) => {
            if (updateErr) {
              console.error("OTP update error:", updateErr);
              return res.status(500).json({ 
                success: false,
                message: "Company data saved but OTP sending failed" 
              });
            }
            
            // Send OTP email
            await sendOtpEmail(email, otp, businessname);
            
            res.status(200).json({ 
              success: true,
              message: "✅ Company verification submitted successfully. OTP sent to your email." 
            });
          });
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          res.status(500).json({ 
            success: false,
            message: "Company data saved but OTP email failed to send" 
          });
        }
      }
    );
  } catch (error) {
    console.error("Server error in verify-company:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during verification" 
    });
  }
});

// ✅ OTP Verification endpoint
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  console.log("OTP verification request:", { email, otp });

  const sql = "SELECT otp, otp_expiry FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const user = results[0];
    console.log("Stored OTP:", user.otp, "Input OTP:", otp);

    if (user.otp != otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const updateSql = `
      UPDATE users 
      SET otp = NULL, otp_expiry = NULL, is_verified = 1 
      WHERE email = ?
    `;
    db.query(updateSql, [email], (updateErr) => {
      if (updateErr) {
        console.error("Verification update error:", updateErr);
        return res.status(500).json({
          success: false,
          message: "Failed to update verification status",
        });
      }

      res.json({
        success: true,
        message: "✅ OTP verified successfully! Your account is now verified.",
      });
    });
  });
});

// ✅ ADD THIS ENDPOINT - Company Verification Check
app.get("/api/check-company", (req, res) => {
  const { email } = req.query;
  console.log("🔍 Checking company for email:", email);
  
  if (!email) {
    return res.status(400).json({ exists: false, message: "Email required" });
  }

  const sql = "SELECT id FROM company_verification WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Error checking company:", err);
      return res.status(500).json({ exists: false, message: "Database error" });
    }
    
    console.log("✅ Company check results:", results);
    const exists = results.length > 0;
    res.json({ exists: exists });
  });
});
// ✅ Get user by ID
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`👤 Fetching user data for ID: ${userId}`);
  
  const sql = `
    SELECT 
      u.id,
      u.fullName as name,
      u.email,
      u.phoneNumber as phone,
      u.role,
      u.is_verified,
      cv.businessname as businessName,
      cv.businessAddress,
      cv.state,
      cv.country,
      cv.panGstNumber
    FROM users u
    LEFT JOIN company_verification cv ON u.email = cv.email
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Database error fetching user data:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user information",
        error: err.message
      });
    }

    if (results.length === 0) {
      console.log("❌ No user found for ID:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = results[0];
    
    console.log("✅ Found user:", user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        businessName: user.businessName || '',
        role: user.role,
        isVerified: user.is_verified === 1,
        businessAddress: user.businessAddress || '',
        state: user.state || '',
        country: user.country || '',
        panGstNumber: user.panGstNumber || ''
      }
    });
  });
});// ✅ Update user information
app.put("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  const { name, phone, businessName } = req.body;
  
  console.log(`📝 Updating user ${userId} with:`, { name, phone, businessName });

  // First, get the user's email to update company_verification
  const getEmailSql = "SELECT email FROM users WHERE id = ?";
  db.query(getEmailSql, [userId], (err, emailResults) => {
    if (err || emailResults.length === 0) {
      console.error("❌ Error fetching user email:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user email"
      });
    }

    const userEmail = emailResults[0].email;
    
    // Update the users table (fullName and phoneNumber)
    const updateUserSql = `
      UPDATE users 
      SET fullName = ?, phoneNumber = ?
      WHERE id = ?
    `;
    
    db.query(updateUserSql, [name, phone, userId], (err, userResult) => {
      if (err) {
        console.error("❌ Error updating user table:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to update user information"
        });
      }

      // Update company_verification table if businessName is provided
      if (businessName && businessName.trim() !== '') {
        const checkCompanySql = "SELECT id FROM company_verification WHERE email = ?";
        db.query(checkCompanySql, [userEmail], (err, companyResults) => {
          if (err) {
            console.error("❌ Error checking company verification:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to check company verification"
            });
          }

          if (companyResults.length > 0) {
            // Update existing company verification
            const updateCompanySql = `
              UPDATE company_verification 
              SET businessname = ?
              WHERE email = ?
            `;
            
            db.query(updateCompanySql, [businessName, userEmail], (err) => {
              if (err) {
                console.error("❌ Error updating company verification:", err);
                return res.status(500).json({
                  success: false,
                  message: "Failed to update company information"
                });
              }
              
              res.json({
                success: true,
                message: "✅ User and company information updated successfully",
                user: {
                  id: userId,
                  name,
                  phone,
                  businessName
                }
              });
            });
          } else {
            // Create new company verification entry
            const createCompanySql = `
              INSERT INTO company_verification (email, businessname)
              VALUES (?, ?)
            `;
            
            db.query(createCompanySql, [userEmail, businessName], (err) => {
              if (err) {
                console.error("❌ Error creating company verification:", err);
                return res.status(500).json({
                  success: false,
                  message: "Failed to create company information"
                });
              }
              
              res.json({
                success: true,
                message: "✅ User information updated and company profile created",
                user: {
                  id: userId,
                  name,
                  phone,
                  businessName
                }
              });
            });
          }
        });
      } else {
        // Only update user table
        res.json({
          success: true,
          message: "✅ User information updated successfully",
          user: {
            id: userId,
            name,
            phone,
            businessName: businessName || ''
          }
        });
      }
    });
  });
});
// ✅ Get user by email (for OTP verification flow)
app.get("/api/users/email/:email", (req, res) => {
  const userEmail = req.params.email;
  console.log(`👤 Fetching user data for email: ${userEmail}`);
  
  const sql = `
    SELECT 
      u.id,
      u.fullName as name,
      u.email,
      u.phoneNumber as phone,
      u.role,
      u.is_verified
    FROM users u
    WHERE u.email = ?
  `;

  db.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.error("❌ Database error fetching user data:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user information",
        error: err.message
      });
    }

    if (results.length === 0) {
      console.log("❌ No user found for email:", userEmail);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = results[0];
    
    console.log("✅ Found user by email:", user.email, "ID:", user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        isVerified: user.is_verified === 1
      }
    });
  });
});
// ================================
// 📦 MEDICINES CRUD ROUTES
// ================================

// ✅ Get medicines for specific manufacturer (based on their company)
app.get("/api/medicines", (req, res) => {
  const userEmail = req.query.user_email; // Get user email from query params
  
  console.log("🔍 Fetching medicines for user:", userEmail);
  
  let sql = `
    SELECT 
      p.*, 
      c.businessName, 
      c.state, 
      c.country 
    FROM products p
    LEFT JOIN company_verification c ON p.company_id = c.id
  `;
  
  let params = [];
  
  // If user_email is provided, filter by that user's company
  if (userEmail) {
    sql += ` WHERE c.email = ?`;
    params = [userEmail];
    console.log("✅ Filtering medicines for user:", userEmail);
  } else {
    console.log("⚠️ No user email provided, returning all medicines");
  }
  
  sql += ` ORDER BY p.id DESC`;
  
  console.log("📊 Executing SQL:", sql, "with params:", params);
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching medicines:", err);
      return res.status(500).json({ message: "Database error" });
    }
    
    console.log(`✅ Found ${results.length} medicines for user: ${userEmail || 'ALL USERS'}`);
    res.json(results);
  });
});

// ➕ Add a new product (linked to manufacturer's company)
// ✏️ FIXED: Add a new product (linked to manufacturer's company)
app.post("/api/medicines", upload.single("image"), (req, res) => {
  console.log("=== MEDICINE UPLOAD REQUEST ===");
  console.log("Body:", req.body);
  console.log("File:", req.file);
  console.log("=== END REQUEST ===");

  const {
    sku,
    name,
    description,
    unit,
    unit_price,
    tax_rate,
    mfg_date,
    expiry_date,
    category,
    stock_qty,
    status,
    user_email
  } = req.body;

  // File path
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  console.log("Processing medicine data:", {
    sku, name, user_email, image: req.file ? req.file.filename : 'No image'
  });

  // Check if user_email is provided
  if (!user_email) {
    console.error("No user_email provided in request");
    return res.status(400).json({ 
      success: false,
      message: "User email is required. Please make sure you're logged in." 
    });
  }

  // ✅ FIXED: Proper date formatting function
  const formatDateForMySQL = (dateString) => {
    if (!dateString) return null;
    
    console.log(`📅 Formatting date: ${dateString}`);
    
    try {
      // If it's already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.log(`✅ Already in correct format: ${dateString}`);
        return dateString;
      }
      
      // If it's an ISO string with timezone (e.g., 2025-11-26T18:30:00.000Z)
      if (dateString.includes('T')) {
        // Extract just the date part (YYYY-MM-DD)
        const datePart = dateString.split('T')[0];
        console.log(`📅 Extracted date part from ISO: ${datePart}`);
        
        // Validate the date part
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
      }
      
      // Try to parse other date formats
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('❌ Invalid date:', dateString);
        return null;
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const formatted = `${year}-${month}-${day}`;
      console.log(`📅 Formatted date: ${dateString} -> ${formatted}`);
      
      return formatted;
    } catch (error) {
      console.error('❌ Error formatting date:', error, 'for input:', dateString);
      return null;
    }
  };

  // Format dates for MySQL - ✅ FIXED: Actually call the function
  const formattedMfgDate = formatDateForMySQL(mfg_date);
  const formattedExpiryDate = formatDateForMySQL(expiry_date);

  // ✅ ADDED: Validation for formatted dates
  if (!formattedMfgDate) {
    return res.status(400).json({
      success: false,
      message: "Invalid manufacturing date format. Please use YYYY-MM-DD format."
    });
  }

  if (!formattedExpiryDate) {
    return res.status(400).json({
      success: false,
      message: "Invalid expiry date format. Please use YYYY-MM-DD format."
    });
  }

  console.log("Formatted dates for MySQL:", {
    mfg_date: formattedMfgDate,
    expiry_date: formattedExpiryDate
  });

  // First, get the company ID based on user email
  const getCompanySql = "SELECT id FROM company_verification WHERE email = ?";
  db.query(getCompanySql, [user_email], (err, companyResults) => {
    if (err) {
      console.error("❌ Error fetching company:", err);
      return res.status(500).json({ 
        success: false,
        message: "Failed to fetch company data",
        error: err.message 
      });
    }

    if (companyResults.length === 0) {
      console.error("❌ No company found for email:", user_email);
      return res.status(400).json({ 
        success: false,
        message: "Company not found for this email. Please complete company verification first." 
      });
    }

    const company_id = companyResults[0].id;
    console.log("✅ Found company ID:", company_id, "for email:", user_email);

    const sql = `
      INSERT INTO products
      (sku, name, description, unit, unit_price, tax_rate, mfg_date, expiry_date, category, stock_qty, status, image, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      sku, 
      name, 
      description || '', 
      unit || 'pcs',
      parseFloat(unit_price) || 0,
      parseFloat(tax_rate) || 0,
      formattedMfgDate, // ✅ Use properly formatted date
      formattedExpiryDate, // ✅ Use properly formatted date
      category || 'health devices',
      parseInt(stock_qty) || 0,
      status || 'Stock',
      image,
      company_id
    ];

    console.log("📊 Executing SQL with values:", JSON.stringify(values, null, 2));

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("❌ Database error adding medicine:", err);
        console.error("SQL Error:", err.message);
        
        // Check if it's a date format error
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE' && err.sqlMessage.includes('date')) {
          return res.status(400).json({ 
            success: false,
            message: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-11-26)",
            error: "Date format error"
          });
        }
        
        return res.status(500).json({ 
          success: false,
          message: "Failed to add medicine",
          error: err.message
        });
      }

      console.log("✅ Medicine added successfully with ID:", result.insertId);
      
      res.status(201).json({
        success: true,
        id: result.insertId,
        sku,
        name,
        description,
        unit,
        unit_price: parseFloat(unit_price) || 0,
        tax_rate: parseFloat(tax_rate) || 0,
        mfg_date: formattedMfgDate,
        expiry_date: formattedExpiryDate,
        category,
        stock_qty: parseInt(stock_qty) || 0,
        status,
        image,
        company_id,
        message: "✅ Medicine added successfully"
      });
    });
  });
});
// Add this before your medicine update route for debugging
app.use("/api/medicines/:id", (req, res, next) => {
  console.log('=========================================');
  console.log('🔄 UPDATE MEDICINE DEBUG INFO:');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Request Body:', req.body);
  console.log('Body Type:', typeof req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('=========================================');
  next();
});
// ✅ FIXED: Update medicine endpoint with better error handling
app.put("/api/medicines/:id", upload.single("image"), (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 UPDATE REQUEST for medicine ID:', id);
    console.log('📦 Request body fields:', req.body);
    console.log('🖼️ Uploaded file:', req.file);
    console.log('📄 Content-Type:', req.headers['content-type']);
    
    // Check if body exists and has fields
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ Empty request body');
      return res.status(400).json({ 
        success: false,
        message: "No data provided for update" 
      });
    }
    
    // Get ALL fields from request body with defaults
    const {
      medicine_name,
      name,
      sku,
      description,
      unit_type,
      unit,
      unit_price,
      gst_percentage,
      tax_rate,
      batch_number,
      mfg_date,
      expiry_date,
      category,
      stock_qty,
      status,
      hsn_code,
      manufacturer
    } = req.body;
    
    // Map frontend names to backend database column names
    const mappedData = {
      name: medicine_name || name || '',
      sku: sku || '',
      description: description || '',
      unit: unit_type || unit || 'tablets',
      unit_price: unit_price ? parseFloat(unit_price) : 0,
      tax_rate: gst_percentage || tax_rate || 0,
      mfg_date: batch_number || mfg_date || null,
      expiry_date: expiry_date || null,
      category: category || '',
      stock_qty: stock_qty ? parseInt(stock_qty) : 0,
      status: status || 'active',
      hsn_code: hsn_code || '',
      manufacturer: manufacturer || ''
    };
    
    // If a new image was uploaded, add it to the update
    if (req.file) {
      mappedData.image = `/uploads/${req.file.filename}`;
      console.log('✅ New image added:', mappedData.image);
    }
    
    console.log('📊 Mapped data for update:', mappedData);
    
    // Validate required fields
    if (!mappedData.name || mappedData.name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Medicine name is required"
      });
    }
    
    // Format dates for MySQL
    const formatDate = (dateString) => {
      if (!dateString) return null;
      
      try {
        // If already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        
        // If ISO string
        if (dateString.includes('T')) {
          return dateString.split('T')[0];
        }
        
        // Try to parse as date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('⚠️ Could not parse date:', dateString);
          return null;
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('❌ Date formatting error:', error);
        return null;
      }
    };
    
    const formattedMfgDate = formatDate(mappedData.mfg_date);
    const formattedExpiryDate = formatDate(mappedData.expiry_date);
    
    console.log('🔍 Building SQL update for medicine ID:', id);
    
    // Build update SQL based on what fields are provided
    const updateFields = [];
    const values = [];
    
    // Database column names for products table (based on your schema)
    const fieldMapping = {
      name: mappedData.name,
      sku: mappedData.sku,
      description: mappedData.description,
      unit: mappedData.unit,
      unit_price: mappedData.unit_price,
      tax_rate: mappedData.tax_rate,
      mfg_date: formattedMfgDate,
      expiry_date: formattedExpiryDate,
      category: mappedData.category,
      stock_qty: mappedData.stock_qty,
      status: mappedData.status,
      hsn_code: mappedData.hsn_code,
      manufacturer: mappedData.manufacturer,
      image: mappedData.image // Include image if present
    };
    
    for (const [field, value] of Object.entries(fieldMapping)) {
      if (value !== undefined && value !== null && value !== '') {
        updateFields.push(`${field} = ?`);
        values.push(value);
        console.log(`   ✓ ${field}: ${value}`);
      }
    }
    if (updateFields.length === 0) {
      console.error('❌ No valid fields to update');
      return res.status(400).json({
        success: false,
        message: "No valid fields to update"
      });
    }
    
    values.push(parseInt(id));
    
    const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    
    console.log('📝 Final SQL:', sql);
    console.log('📦 Values:', values);
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ Database error:', err);
        console.error('❌ SQL Error code:', err.code);
        console.error('❌ SQL Error message:', err.sqlMessage);
        console.error('❌ Full error:', err);
        
        return res.status(500).json({
          success: false,
          message: "Database error updating medicine",
          error: err.message,
          sqlError: err.sqlMessage,
          code: err.code
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Medicine not found"
        });
      }
      
      console.log(`✅ Medicine ${id} updated successfully. Rows affected: ${result.affectedRows}`);
      
      // Get the updated medicine to return
      const getUpdatedSql = `SELECT * FROM products WHERE id = ?`;
      db.query(getUpdatedSql, [id], (getErr, getResults) => {
        if (getErr) {
          console.error('❌ Error fetching updated medicine:', getErr);
          return res.json({
            success: true,
            message: "Medicine updated successfully",
            affectedRows: result.affectedRows
          });
        }
        
        const updatedMedicine = getResults[0];
        
        res.json({
          success: true,
          message: "Medicine updated successfully",
          medicine: updatedMedicine,
          affectedRows: result.affectedRows
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Unhandled error in update route:', error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});
// ✅ Get all verified MANUFACTURERS for wholesaler catalog (FIXED)
app.get("/api/companies", (req, res) => {
  console.log("🏭 Fetching all verified MANUFACTURERS for catalog...");
  
  const sql = `
    SELECT DISTINCT
      cv.id,
      cv.businessname as businessName,
      cv.panGstNumber,
      cv.state,
      cv.country,
      cv.email,
      'verified' as status
    FROM company_verification cv
    INNER JOIN users u ON cv.email = u.email
    WHERE cv.businessname IS NOT NULL 
    AND cv.businessname != ''
    AND u.role = 'manufacturer'
    AND u.is_verified = 1
    ORDER BY cv.businessname ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Database error fetching manufacturers:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch manufacturers from database"
      });
    }

    console.log(`✅ Found ${results.length} MANUFACTURERS in database`);
    
    res.json(results);
  });
});

// ✅ Get products by company name (for wholesaler search)
// ✅ Get products by company name (for wholesaler search) - SHOW ALL PRODUCTS
app.get("/api/medicines/company/:companyName", (req, res) => {
  const { companyName } = req.params;
  console.log(`🏭 Fetching ALL products for company: ${companyName}`);
  
  const sql = `
    SELECT 
      p.*, 
      c.businessName, 
      c.state, 
      c.country 
    FROM products p
    LEFT JOIN company_verification c 
    ON p.company_id = c.id
    WHERE c.businessName LIKE ?
    ORDER BY p.id DESC
  `;
  
  db.query(sql, [`%${companyName}%`], (err, results) => {
    if (err) {
      console.error("❌ Error fetching company products:", err);
      return res.status(500).json({ message: "Database error" });
    }
    
    console.log(`✅ Found ${results.length} products for company: ${companyName}`);
    
    // Log stock details for debugging
    if (results.length > 0) {
      console.log("📊 Product Stock Details:");
      results.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name || 'Unnamed'} - ID: ${product.id} - Stock: ${product.stock_qty || 0} - Price: $${product.unit_price || 0}`);
      });
    }
    
    res.json(results);
  });
});
// ✅ Total manufactured units (SUM of stock_qty)
app.get("/api/medicines/total", (req, res) => {
  const sql = "SELECT SUM(stock_qty) AS totalManufactured FROM products";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching total manufactured:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json({
      total: result[0].totalManufactured || 0
    });
  });
});

// In server.js, add these endpoints near the other routes (around line 800-850)
// Add this function to update notification status when order is processed
const markNotificationAsProcessed = (db, orderId, userId) => {
  return new Promise((resolve, reject) => {
    console.log(`📝 Marking notifications as processed for order ${orderId}, user ${userId}`);
    
    // Mark as read or delete notifications related to this order for this user
    const sql = `
      UPDATE notifications 
      SET is_read = 1, 
          processed_at = NOW() 
      WHERE related_order_id = ? 
      AND user_id = ? 
      AND (type = 'order_request' OR type = 'new_order')
    `;
    
    db.query(sql, [orderId, userId], (err, result) => {
      if (err) {
        console.error('❌ Error marking notification as processed:', err);
        reject(err);
      } else {
        console.log(`✅ Notifications marked as processed: ${result.affectedRows} rows affected`);
        resolve(result);
      }
    });
  });
};

// ✅ Add notification deletion endpoint
app.delete('/api/notifications/order/:orderId/user/:userId', (req, res) => {
  const { orderId, userId } = req.params;
  
  console.log(`🗑️ Deleting notifications for order ${orderId}, user ${userId}`);
  
  const sql = `
    DELETE FROM notifications 
    WHERE related_order_id = ? 
    AND user_id = ? 
    AND (type = 'order_request' OR type = 'new_order')
  `;
  
  db.query(sql, [orderId, userId], (err, result) => {
    if (err) {
      console.error('❌ Error deleting notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
    
    console.log(`✅ Notifications deleted: ${result.affectedRows} rows affected`);
    
    res.json({
      success: true,
      message: `Notification for order ${orderId} deleted`,
      deletedCount: result.affectedRows
    });
  });
});
// Get notifications for a specific user with better filtering
app.get('/api/notifications/:userId', (req, res) => {
  const db = req.db;
  const { userId } = req.params;
  const { 
    limit = 50, 
    page = 1, 
    type, 
    unread_only,
    user_role // Add this parameter
  } = req.query;

  console.log(`📡 Fetching notifications for user ${userId}, role: ${user_role}`);
  
  // First, get user role
  const getUserRoleSql = 'SELECT role FROM users WHERE id = ?';
  
  db.query(getUserRoleSql, [userId], (roleErr, roleResults) => {
    if (roleErr || roleResults.length === 0) {
      console.error('❌ Error fetching user role:', roleErr);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user information"
      });
    }
    
    const userRole = user_role || roleResults[0].role;
    console.log(`👤 User ${userId} is a ${userRole}`);
    
    let sql = `
      SELECT 
        id,
        user_id,
        title,
        message,
        type,
        related_order_id,
        is_read,
        created_at
      FROM notifications 
      WHERE user_id = ?
    `;
    
    const params = [userId];

    // Filter by user role
    if (userRole === 'manufacturer') {
      // Manufacturers should only see new order requests
      sql += ` AND (type = 'new_order' OR type = 'order_request')`;
    } else if (userRole === 'wholesaler') {
      // Wholesalers should only see order status updates
      sql += ` AND (type = 'order_approved' OR type = 'order_rejected' OR type = 'invoice_sent')`;
    }
    
    // Add other filters
    if (type) {
      sql += ` AND type IN (?)`;
      params.push(type.split(','));
    }
    
    if (unread_only === 'true') {
      sql += ` AND is_read = 0`;
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("❌ Error fetching notifications:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch notifications"
        });
      }
      
      console.log(`✅ Found ${results.length} notifications for ${userRole} ${userId}`);
      
      // Get unread count with same filters
      let countSql = `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`;
      const countParams = [userId];
      
      if (userRole === 'manufacturer') {
        countSql += ` AND (type = 'new_order' OR type = 'order_request')`;
      } else if (userRole === 'wholesaler') {
        countSql += ` AND (type = 'order_approved' OR type = 'order_rejected' OR type = 'invoice_sent')`;
      }
      
      if (unread_only === 'true') {
        countSql += ` AND is_read = 0`;
      }
      
      if (type) {
        countSql += ` AND type IN (?)`;
        countParams.push(type.split(','));
      }
      
      db.query(countSql, countParams, (countErr, countResults) => {
        if (countErr) {
          console.error("❌ Error counting notifications:", countErr);
          return res.status(500).json({
            success: false,
            message: "Failed to count notifications"
          });
        }
        
        // Get unread count
        const unreadSql = `SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0`;
        db.query(unreadSql, [userId], (unreadErr, unreadResults) => {
          if (unreadErr) {
            console.error("❌ Error counting unread:", unreadErr);
          }
          
          const unreadCount = unreadResults ? unreadResults[0].unread : 0;
          const total = countResults[0].total;
          
          res.json({
            success: true,
            notifications: results,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: total,
              unreadCount: unreadCount,
              totalPages: Math.ceil(total / parseInt(limit)),
              userRole: userRole
            }
          });
        });
      });
    });
  });
});
// Add this debug function to check the order
app.get('/api/debug/order/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  console.log(`🔍 DEBUG: Checking order ${orderId}`);
  
  // First check orders table
  const checkOrderSql = `SELECT * FROM orders WHERE order_id = ?`;
  
  db.query(checkOrderSql, [orderId], (err, results) => {
    if (err) {
      console.error('❌ DEBUG: Error checking order:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`✅ DEBUG: Found ${results.length} orders`);
    
    if (results.length > 0) {
      const order = results[0];
      console.log('📊 DEBUG: Order details:', {
        id: order.id,
        order_id: order.order_id,
        status: order.status,
        manufacturer_id: order.manufacturer_id,
        wholesaler_id: order.wholesaler_id,
        product_id: order.product_id
      });
    }
    
    // Now run the full query to see what's missing
    const fullQuery = `
      SELECT 
        o.*,
        m.id as manufacturer_id,
        m.fullName as manufacturer_person_name,
        m.email as manufacturer_email,
        cm.businessname as manufacturer_business_name,
        cm.businessAddress as manufacturer_address,
        cm.panGstNumber as manufacturer_gstin,
        cm.state as manufacturer_state,
        w.id as wholesaler_id,
        w.fullName as wholesaler_person_name,
        w.email as wholesaler_email,
        cw.businessname as wholesaler_business_name,
        cw.businessAddress as wholesaler_address,
        cw.panGstNumber as wholesaler_gstin,
        cw.state as wholesaler_state,
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.description,
        p.unit_price,
        p.tax_rate,
        p.unit,
        p.category
      FROM orders o
      JOIN users m ON o.manufacturer_id = m.id
      JOIN users w ON o.wholesaler_id = w.id
      JOIN products p ON o.product_id = p.id
      LEFT JOIN company_verification cm ON m.email = cm.email
      LEFT JOIN company_verification cw ON w.email = cw.email
      WHERE o.order_id = ?
    `;
    
    db.query(fullQuery, [orderId], (queryErr, queryResults) => {
      if (queryErr) {
        console.error('❌ DEBUG: Error in full query:', queryErr);
        return res.json({
          simpleQuery: results,
          fullQueryError: queryErr.message
        });
      }
      
      console.log(`✅ DEBUG: Full query returned ${queryResults.length} results`);
      
      if (queryResults.length > 0) {
        console.log('📊 DEBUG: Full query first result:', Object.keys(queryResults[0]));
      }
      
      res.json({
        simpleQuery: results,
        fullQuery: queryResults,
        message: `Order ${orderId} check complete`
      });
    });
  });
});
// ✅ Add notification read endpoint for specific order
app.post('/api/notifications/order/:orderId/mark-read', (req, res) => {
  const { orderId } = req.params;
  const { userId } = req.body;
  
  console.log(`📝 Marking notifications as read for order ${orderId}, user ${userId}`);
  
  const sql = `
    UPDATE notifications 
    SET is_read = 1, 
        read_at = NOW() 
    WHERE related_order_id = ? 
    AND user_id = ? 
    AND is_read = 0
  `;
  
  db.query(sql, [orderId, userId], (err, result) => {
    if (err) {
      console.error('❌ Error marking notification as read:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
    
    console.log(`✅ Notifications marked as read: ${result.affectedRows} rows affected`);
    
    res.json({
      success: true,
      message: `Notifications for order ${orderId} marked as read`,
      updatedCount: result.affectedRows
    });
  });
});

// ✅ Get all manufacturers for admin panel
app.get("/api/admin/manufacturers", (req, res) => {
  console.log("📋 Fetching all manufacturers for admin...");
  
  const sql = `
    SELECT 
      id,
      businessname,
      email,
      cinGstin,
      panGstNumber,
      businessAddress,
      state,
      country,
      zipCode,
      website,
      registrationCertificate,
      businessIdProof,
      createdAt
    FROM company_verification 
    ORDER BY createdAt DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Database error fetching manufacturers:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch manufacturers from database"
      });
    }

    console.log(`✅ Found ${results.length} manufacturers in database`);
    
    res.json({
      success: true,
      manufacturers: results,
      total: results.length
    });
  });
});

// ✅ Get products for manufacturer (for invoice creation)
app.get("/api/manufacturer/products/:manufacturerId", (req, res) => {
  const manufacturerId = req.params.manufacturerId;
  
  // First get manufacturer email
  const getEmailSql = "SELECT email FROM users WHERE id = ?";
  db.query(getEmailSql, [manufacturerId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Manufacturer not found"
      });
    }
    
    const manufacturerEmail = results[0].email;
    
    // Get products for this manufacturer
    const sql = `
      SELECT p.* 
      FROM products p
      LEFT JOIN company_verification cv ON p.company_id = cv.id
      WHERE cv.email = ? AND p.stock_qty > 0
      ORDER BY p.name
    `;
    
    db.query(sql, [manufacturerEmail], (err, products) => {
      if (err) {
        console.error("❌ Error fetching manufacturer products:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch products"
        });
      }
      
      res.json({
        success: true,
        products: products
      });
    });
  });
});


// ================================
// 👥 WHOLESALER MANAGEMENT ROUTES
// ================================

// ✅ Get wholesaler info by user ID - UPDATED VERSION
app.get("/api/wholesalers/user/:userId", (req, res) => {
  const userId = req.params.userId;
  console.log(`🏪 Fetching wholesaler info for user ID: ${userId}`);
  
  const sql = `
    SELECT 
      u.id,
      u.fullName as businessName,
      u.email,
      u.phoneNumber as phone,
      u.role,
      cv.businessAddress as warehouseAddress,
      cv.state,
      cv.country,
      cv.panGstNumber,
      cv.businessname as verifiedBusinessName
    FROM users u
    LEFT JOIN company_verification cv ON u.email = cv.email
    WHERE u.id = ? AND u.role = 'wholesaler'
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Database error fetching wholesaler:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch wholesaler information"
      });
    }

    if (results.length === 0) {
      console.log("❌ No wholesaler found for user ID:", userId);
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found"
      });
    }

    const wholesaler = results[0];
    
    // Use verified business name if available, otherwise use fullName
    const businessName = wholesaler.verifiedBusinessName || wholesaler.businessName;
    
    console.log("✅ Found wholesaler:", businessName);
    
    res.json({
      id: wholesaler.id,
      businessName: businessName,
      email: wholesaler.email,
      phone: wholesaler.phone,
      warehouseAddress: wholesaler.warehouseAddress,
      state: wholesaler.state,
      country: wholesaler.country,
      panGstNumber: wholesaler.panGstNumber,
      role: wholesaler.role,
      isVerified: !!wholesaler.verifiedBusinessName // Check if company is verified
    });
  });
});// ✅ Get all wholesalers (for admin)
app.get("/api/wholesalers", (req, res) => {
  console.log("📋 Fetching all wholesalers...");
  
  const sql = `
    SELECT 
      u.id,
      u.fullName as businessName,
      u.email,
      u.phoneNumber as phone,
      cv.businessAddress as warehouseAddress,
      cv.state,
      cv.country
    FROM users u
    LEFT JOIN company_verification cv ON u.email = cv.email
    WHERE u.role = 'wholesaler'
    ORDER BY u.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error fetching wholesalers:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch wholesalers"
      });
    }

    console.log(`✅ Found ${results.length} wholesalers`);
    res.json({
      success: true,
      wholesalers: results,
      total: results.length
    });
  });
});
// Fix: Update order status and create proper notification
app.patch('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status, rejectionReason, userId } = req.body;
  
  console.log(`🔄 Updating order ${orderId} status to: ${status}`);
  console.log('Request body:', req.body);
  
  // Validate status
  const validStatuses = ['pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  // Get order details including wholesaler_id
  const getOrderSql = `
    SELECT 
      o.*,
      wu.fullName as wholesaler_name,
      mu.fullName as manufacturer_name,
      p.name as medicine_name
    FROM orders o
    LEFT JOIN users wu ON o.wholesaler_id = wu.id
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.order_id = ? OR o.id = ?
  `;
  
  db.query(getOrderSql, [orderId, orderId], (err, orderResults) => {
    if (err) {
      console.error('❌ Error fetching order:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error fetching order',
        error: err.message
      });
    }
    
    if (orderResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found`
      });
    }
    
    const order = orderResults[0];
    const wholesalerId = order.wholesaler_id;
    
    console.log(`📋 Order details:`, {
      orderId: order.order_id,
      wholesalerId: wholesalerId,
      currentStatus: order.status,
      newStatus: status,
      medicine: order.medicine_name
    });
    
    // Update order status
    const updateSql = `
      UPDATE orders 
      SET 
        status = ?, 
        rejection_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    db.query(updateSql, [status, rejectionReason || null, order.id], (err, updateResult) => {
      if (err) {
        console.error('❌ Error updating order:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to update order status',
          error: err.message
        });
      }
      
      console.log(`✅ Order ${orderId} updated successfully. Rows affected: ${updateResult.affectedRows}`);
      
      // Create notification for the wholesaler based on status
      let notificationType, notificationTitle, notificationMessage;
      
      switch(status) {
        case 'approved':
          notificationType = 'order_approved';
          notificationTitle = 'Order Approved!';
          notificationMessage = `Your order #${order.order_id} has been approved by the manufacturer`;
          break;
        case 'rejected':
          notificationType = 'order_rejected';
          notificationTitle = 'Order Rejected';
          notificationMessage = `Your order #${order.order_id} was rejected`;
          if (rejectionReason) {
            notificationMessage += `: ${rejectionReason}`;
          }
          break;
        default:
          notificationType = 'order_request';
          notificationTitle = `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`;
          notificationMessage = `Your order #${order.order_id} status changed to ${status}`;
      }
      
      // Check if notification already exists for this order and user
      const checkNotificationSql = `
        SELECT id FROM notifications 
        WHERE user_id = ? 
        AND related_order_id = ? 
        AND type IN ('order_approved', 'order_rejected', 'order_request')
      `;
      
      db.query(checkNotificationSql, [wholesalerId, order.order_id], (checkErr, checkResults) => {
        if (checkErr) {
          console.error('❌ Error checking existing notification:', checkErr);
        }
        
        let notificationAction = 'created';
        
        if (checkResults && checkResults.length > 0) {
          // Update existing notification
          const updateNotificationSql = `
            UPDATE notifications 
            SET 
              title = ?,
              message = ?,
              type = ?,
              is_read = 0,
              created_at = NOW()
            WHERE id = ?
          `;
          
          db.query(updateNotificationSql, [
            notificationTitle,
            notificationMessage,
            notificationType,
            checkResults[0].id
          ], (updateNotifErr) => {
            if (updateNotifErr) {
              console.error('❌ Error updating notification:', updateNotifErr);
            } else {
              console.log(`📝 Updated existing notification for order ${order.order_id}`);
              notificationAction = 'updated';
            }
          });
        } else {
          // Create new notification
          const createNotificationSql = `
            INSERT INTO notifications 
            (user_id, title, message, type, related_order_id, is_read)
            VALUES (?, ?, ?, ?, ?, 0)
          `;
          
          db.query(createNotificationSql, [
            wholesalerId,
            notificationTitle,
            notificationMessage,
            notificationType,
            order.order_id
          ], (createErr, createResult) => {
            if (createErr) {
              console.error('❌ Error creating notification:', createErr);
            } else {
              console.log(`📢 Created new notification for wholesaler ${wholesalerId}`);
            }
          });
        }
        
        // Send real-time update via socket.io
        const socketData = {
          orderId: order.order_id,
          order_id: order.order_id,
          status: status,
          targetWholesalerId: wholesalerId,
          message: notificationMessage,
          timestamp: new Date().toISOString(),
          medicine_name: order.medicine_name || 'N/A',
          manufacturer_name: order.manufacturer_name || 'N/A'
        };
        
        // Emit socket event
        console.log(`📤 Broadcasting to wholesaler-${wholesalerId}:`, socketData);
        req.io.to(`wholesaler-${wholesalerId}`).emit('orderUpdate', socketData);
        
        // Also emit a general event for all connected clients
        req.io.emit('orderStatusChanged', socketData);
        
        res.json({
          success: true,
          message: `Order status updated to ${status}`,
          notification: notificationMessage,
          notificationAction: notificationAction,
          socketSent: true,
          order: {
            id: order.order_id,
            status: status,
            wholesalerId: wholesalerId
          }
        });
      });
    });
  });
});// Wholesaler places an order
app.post('/api/orders/place', (req, res) => {
  const {
    wholesaler_id,
    manufacturer_id,
    product_id,
    quantity,
    total_amount,
    notes
  } = req.body;
  
  // Generate unique order ID
  const order_id = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const sql = `
    INSERT INTO orders 
    (order_id, wholesaler_id, manufacturer_id, product_id, quantity, total_amount, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
  `;
  
  db.query(sql, [
    order_id,
    wholesaler_id,
    manufacturer_id,
    product_id,
    quantity,
    total_amount,
    notes || ''
  ], (err, result) => {
    if (err) {
      console.error('❌ Error placing order:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to place order'
      });
    }
    
    console.log(`✅ Order placed successfully: ${order_id}`);
    
    // Get product details for notification
    const getProductSql = 'SELECT name FROM products WHERE id = ?';
    db.query(getProductSql, [product_id], (prodErr, prodResults) => {
      const productName = prodResults.length > 0 ? prodResults[0].name : 'Unknown Product';
      
      // Create notification for manufacturer
      const notificationSql = `
        INSERT INTO notifications 
        (user_id, type, title, message, related_order_id, is_read)
        VALUES (?, 'new_order', 'New Order Request', ?, ?, 0)
      `;
      
      const message = `New order request for ${productName} (Qty: ${quantity}) from wholesaler`;
      
      db.query(notificationSql, [manufacturer_id, message, order_id], (notifErr) => {
        if (notifErr) {
          console.error('❌ Error creating notification:', notifErr);
        }
        
        // Send socket notification to manufacturer
        req.io.to(`manufacturer-${manufacturer_id}`).emit('newOrder', {
          orderId: order_id,
          productName: productName,
          quantity: quantity,
          wholesalerId: wholesaler_id,
          timestamp: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Order placed successfully',
          order_id: order_id
        });
      });
    });
  });
});

// ✅ SIMPLIFIED: Get wholesaler orders with error handling
app.get('/api/orders/wholesaler/:wholesalerId', (req, res) => {
  const wholesalerId = req.params.wholesalerId;
  console.log(`📦 Fetching orders for wholesaler ID: ${wholesalerId}`);
  
  // First, get basic order info
  const ordersSql = `
    SELECT 
      o.order_id,
      o.status,
      o.total_amount,
      o.subtotal,
      o.gst_amount,
      o.order_date,
      o.created_at,
      o.updated_at,
      o.payment_status,
      o.payment_mode,
      o.delivery_address,
      o.preferred_delivery_date,
      o.notes,
      o.rejection_reason,
      mu.fullName as manufacturer_name,
      mu.email as manufacturer_email,
      cm.businessname as manufacturer_business
    FROM orders o
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN company_verification cm ON mu.email = cm.email
    WHERE o.wholesaler_id = ?
    ORDER BY o.order_date DESC
  `;
  
  db.query(ordersSql, [wholesalerId], (err, orders) => {
    if (err) {
      console.error('❌ Error fetching orders:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: err.message,
        sqlError: true
      });
    }
    
    console.log(`✅ Found ${orders.length} orders for wholesaler ${wholesalerId}`);
    
    // If no orders, return empty array
    if (orders.length === 0) {
      return res.json({
        success: true,
        orders: [],
        total: 0
      });
    }
    
    // Get order IDs
    const orderIds = orders.map(order => order.order_id);
    
    // Get items for these orders
    const itemsSql = `
      SELECT 
        oi.*,
        p.name as original_product_name,
        p.sku,
        p.category,
        p.description,
        p.image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (?)
      ORDER BY oi.order_id, oi.id ASC
    `;
    
    db.query(itemsSql, [orderIds], (itemsErr, items) => {
      if (itemsErr) {
        console.error('❌ Error fetching order items:', itemsErr);
        // Return orders without items
        return res.json({
          success: true,
          orders: orders.map(order => ({
            ...order,
            items: [],
            item_count: 0,
            total_quantity: 0
          })),
          total: orders.length,
          warning: 'Could not fetch order items'
        });
      }
      
      // Group items by order_id
      const itemsByOrder = {};
      items.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });
      
      // Calculate item counts and quantities
      const processedOrders = orders.map(order => {
        const orderItems = itemsByOrder[order.order_id] || [];
        const item_count = orderItems.length;
        const total_quantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        return {
          id: order.order_id,
          order_id: order.order_id,
          status: order.status,
          total_amount: order.total_amount,
          subtotal: order.subtotal,
          gst_amount: order.gst_amount,
          amount: order.total_amount, // Alias
          order_date: order.order_date,
          created_at: order.created_at,
          updated_at: order.updated_at,
          payment_status: order.payment_status,
          payment_mode: order.payment_mode,
          delivery_address: order.delivery_address,
          preferred_delivery_date: order.preferred_delivery_date,
          notes: order.notes,
          rejection_reason: order.rejection_reason,
          manufacturer_name: order.manufacturer_name,
          manufacturer_business: order.manufacturer_business,
          manufacturer_email: order.manufacturer_email,
          item_count: item_count,
          total_quantity: total_quantity,
          items: orderItems,
          formatted_date: order.order_date ? 
            new Date(order.order_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 'N/A',
          formatted_amount: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(order.total_amount || 0)
        };
      });
      
      res.json({
        success: true,
        orders: processedOrders,
        total: processedOrders.length
      });
    });
  });
});
// Helper function to process orders
const processOrders = (orders, itemsByOrder) => {
  return orders.map(order => {
    const orderItems = itemsByOrder[order.order_id] || [];
    
    // Calculate totals from items if not already in order
    const calculatedSubtotal = orderItems.reduce((sum, item) => 
      sum + (item.unit_price * item.quantity), 0
    );
    
    const calculatedGst = orderItems.reduce((sum, item) => 
      sum + (item.gst_amount || 0), 0
    );
    
    const calculatedTotal = orderItems.reduce((sum, item) => 
      sum + (item.final_price || item.total_price || 0), 0
    );
    
    // Get item summary
    const itemSummary = orderItems.map(item => 
      `${item.medicine_name || 'Unknown Item'} (${item.quantity} x ₹${item.unit_price})`
    ).join(', ');
    
    return {
      // Order identifiers
      id: order.order_id,
      order_id: order.order_id,
      
      // Order details
      subtotal: order.subtotal || calculatedSubtotal,
      gst_amount: order.gst_amount || calculatedGst,
      total_amount: order.total_amount || calculatedTotal,
      amount: order.total_amount || calculatedTotal, // Alias for compatibility
      
      // Item information
      item_count: order.item_count || orderItems.length,
      total_quantity: order.total_quantity || orderItems.reduce((sum, item) => sum + item.quantity, 0),
      items: orderItems,
      item_summary: itemSummary,
      
      // Manufacturer information
      manufacturer_name: order.manufacturer_name || 'Unknown Manufacturer',
      manufacturer_business: order.manufacturer_business,
      
      // Wholesaler information
      wholesaler_name: order.wholesaler_name,
      wholesaler_business: order.wholesaler_business,
      
      // Status
      status: order.status?.toLowerCase() || 'pending',
      payment_status: order.payment_status || 'pending',
      payment_mode: order.payment_mode,
      rejection_reason: order.rejection_reason,
      notes: order.notes,
      
      // Delivery information
      delivery_address: order.delivery_address,
      preferred_delivery_date: order.preferred_delivery_date,
      
      // Dates
      created_at: order.created_at,
      order_date: order.order_date,
      updated_at: order.updated_at,
      
      // Formatted versions for display
      formatted_date: order.order_date ? 
        new Date(order.order_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        
      formatted_amount: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(order.total_amount || calculatedTotal || 0)
    };
  });
};
// ================================
// 📦 IMPORTED ROUTES
// ================================
app.use('/api/invoices', invoiceRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/notifications', notificationRoutes);

// ================================
// 🔌 SOCKET.IO HANDLERS
// ================================
// ✅ Search orders
app.get('/api/orders/search', (req, res) => {
  const db = req.db;
  const { 
    userId, 
    role, 
    query, 
    status, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 10 
  } = req.query;

  console.log(`🔍 Searching orders for ${role} ${userId}: ${query}`);

  if (!userId || !role) {
    return res.status(400).json({
      success: false,
      message: 'User ID and role are required'
    });
  }

  let baseSql = `
    SELECT DISTINCT o.*,
      mu.fullName as manufacturer_name,
      cv_m.businessname as manufacturer_business,
      wu.fullName as wholesaler_name,
      cv_w.businessname as wholesaler_business,
      (
        SELECT GROUP_CONCAT(CONCAT(oi.medicine_name, ' (', oi.quantity, ')') SEPARATOR ', ')
        FROM order_items oi
        WHERE oi.order_id = o.order_id
      ) as item_summary
    FROM orders o
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN company_verification cv_m ON mu.email = cv_m.email
    LEFT JOIN users wu ON o.wholesaler_id = wu.id
    LEFT JOIN company_verification cv_w ON wu.email = cv_w.email
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
  `;

  let whereClause = role === 'manufacturer' 
    ? 'WHERE o.manufacturer_id = ?' 
    : 'WHERE o.wholesaler_id = ?';
  
  const params = [userId];

  // Add search query
  if (query) {
    whereClause += ` AND (
      o.order_id LIKE ? OR
      mu.fullName LIKE ? OR
      cv_m.businessname LIKE ? OR
      wu.fullName LIKE ? OR
      cv_w.businessname LIKE ? OR
      oi.medicine_name LIKE ? OR
      p.name LIKE ?
    )`;
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Add status filter
  if (status) {
    whereClause += ` AND o.status = ?`;
    params.push(status);
  }

  // Add date range filter
  if (startDate) {
    whereClause += ` AND DATE(o.order_date) >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ` AND DATE(o.order_date) <= ?`;
    params.push(endDate);
  }

  // Combine SQL
  baseSql += ` ${whereClause} GROUP BY o.id ORDER BY o.order_date DESC`;

  // Add pagination
  const offset = (page - 1) * limit;
  const paginatedSql = `${baseSql} LIMIT ? OFFSET ?`;
  const paginatedParams = [...params, parseInt(limit), parseInt(offset)];

  // Get total count
  const countSql = `SELECT COUNT(DISTINCT o.id) as total ${baseSql.substring(baseSql.indexOf('FROM'))}`;
  
  db.query(countSql, params, (countErr, countResults) => {
    if (countErr) {
      console.error('❌ Error counting search results:', countErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to count search results'
      });
    }

    const total = countResults[0]?.total || 0;

    // Get paginated results
    db.query(paginatedSql, paginatedParams, (err, results) => {
      if (err) {
        console.error('❌ Error searching orders:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to search orders'
        });
      }

      res.json({
        success: true,
        orders: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        searchParams: {
          query,
          status,
          startDate,
          endDate
        }
      });
    });
  });
});
// ✅ Export orders to CSV
app.get('/api/orders/export', (req, res) => {
  const db = req.db;
  const { userId, role, format = 'csv', startDate, endDate } = req.query;

  console.log(`📤 Exporting orders for ${role} ${userId} in ${format} format`);

  if (!userId || !role) {
    return res.status(400).json({
      success: false,
      message: 'User ID and role are required'
    });
  }

  let whereClause = role === 'manufacturer' 
    ? 'WHERE o.manufacturer_id = ?' 
    : 'WHERE o.wholesaler_id = ?';
  
  const params = [userId];

  if (startDate) {
    whereClause += ` AND DATE(o.order_date) >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ` AND DATE(o.order_date) <= ?`;
    params.push(endDate);
  }

  const sql = `
    SELECT 
      o.order_id,
      o.order_date,
      o.status,
      o.payment_status,
      o.total_amount,
      o.subtotal,
      o.gst_amount,
      mu.fullName as manufacturer_name,
      cv_m.businessname as manufacturer_business,
      wu.fullName as wholesaler_name,
      cv_w.businessname as wholesaler_business,
      o.delivery_address,
      o.payment_mode,
      o.notes,
      (
        SELECT GROUP_CONCAT(CONCAT(oi.medicine_name, ' - Qty: ', oi.quantity, ', Price: ₹', oi.unit_price) SEPARATOR '; ')
        FROM order_items oi
        WHERE oi.order_id = o.order_id
      ) as items_details
    FROM orders o
    LEFT JOIN users mu ON o.manufacturer_id = mu.id
    LEFT JOIN company_verification cv_m ON mu.email = cv_m.email
    LEFT JOIN users wu ON o.wholesaler_id = wu.id
    LEFT JOIN company_verification cv_w ON wu.email = cv_w.email
    ${whereClause}
    ORDER BY o.order_date DESC
  `;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error exporting orders:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to export orders'
      });
    }

    if (format === 'json') {
      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    }

    // Convert to CSV
    const headers = [
      'Order ID', 'Order Date', 'Status', 'Payment Status', 'Total Amount',
      'Subtotal', 'GST Amount', 'Manufacturer', 'Manufacturer Business',
      'Wholesaler', 'Wholesaler Business', 'Delivery Address', 'Payment Mode',
      'Notes', 'Items'
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    results.forEach(order => {
      const row = [
        `"${order.order_id || ''}"`,
        `"${order.order_date || ''}"`,
        `"${order.status || ''}"`,
        `"${order.payment_status || ''}"`,
        order.total_amount || 0,
        order.subtotal || 0,
        order.gst_amount || 0,
        `"${order.manufacturer_name || ''}"`,
        `"${order.manufacturer_business || ''}"`,
        `"${order.wholesaler_name || ''}"`,
        `"${order.wholesaler_business || ''}"`,
        `"${order.delivery_address || ''}"`,
        `"${order.payment_mode || ''}"`,
        `"${order.notes || ''}"`,
        `"${order.items_details || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `orders_${role}_${userId}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  });
});
// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 🔥🔥🔥 ALL SOCKET HANDLERS MUST BE INSIDE THIS CONNECTION CALLBACK 🔥🔥🔥
io.on('connection', (socket) => {
  console.log(`✅ New client connected: ${socket.id}`);
  
  // 🆕 Test event handler
  socket.on('test', (data) => {
    console.log('🧪 Test event received from client:', data);
    // Echo back to client for confirmation
    socket.emit('testResponse', {
      message: 'Server received your test!',
      originalData: data,
      serverTime: new Date().toISOString()
    });
  });
  
  // Manufacturer joins their room
  socket.on('join-manufacturer', (manufacturerId) => {
    socket.join(`manufacturer-${manufacturerId}`);
    console.log(`✅ Manufacturer ${manufacturerId} joined room manufacturer-${manufacturerId}`);
    
    // Debug: Check if room exists
    const rooms = Array.from(socket.rooms);
    console.log(`Socket ${socket.id} is in rooms:`, rooms);
  });
  
  // Wholesaler joins their room  
  socket.on('join-wholesaler', (wholesalerId) => {
    socket.join(`wholesaler-${wholesalerId}`);
    console.log(`Wholesaler ${wholesalerId} joined room`);
  });
  
  // Handle order updates from manufacturer
  socket.on('orderUpdate', (data) => {
    console.log('📤 Received orderUpdate from client:', data);
    
    // ✅ ADDED: Check if data exists
    if (!data) {
      console.error('❌ No data received in orderUpdate event');
      socket.emit('error', { message: 'No data provided' });
      return;
    }
    
    // ✅ ADDED: Check if orderId exists
    if (!data.orderId) {
      console.error('❌ No orderId in orderUpdate data:', data);
      socket.emit('error', { message: 'orderId is required' });
      return;
    }
    
    const orderId = data.orderId;
    console.log(`📦 Processing orderUpdate for: ${orderId}`);
    
    // If the data already has targetWholesalerId, use it
    if (data.targetWholesalerId) {
      const targetId = data.targetWholesalerId;
      console.log(`🎯 Direct update: Sending to wholesaler-${targetId}`);
      io.to(`wholesaler-${targetId}`).emit('orderUpdate', data);
      console.log(`✅ Order update sent to wholesaler-${targetId}`);
      return;
    }
    
    // Otherwise, try to get from database
    console.log(`🔍 Looking up wholesaler for order: ${orderId}`);
    const getWholesalerSql = `SELECT wholesaler_id FROM orders WHERE order_id = ?`;
    
    db.query(getWholesalerSql, [orderId], (err, results) => {
      // ... rest of your orderUpdate handler
    });
  });
  
  socket.on('newOrderNotification', (data) => {
    console.log('📦 New order notification received:', data);
    
    if (!data || !data.manufacturerId) {
      console.error('❌ Invalid new order notification data:', data);
      socket.emit('error', { 
        message: 'Manufacturer ID is required for notification',
        data 
      });
      return;
    }
    
    const manufacturerRoom = `manufacturer-${data.manufacturerId}`;
    console.log(`🎯 Attempting to send to room: ${manufacturerRoom}`);
    
    // Debug: Check who's in the room
    const room = io.sockets.adapter.rooms.get(manufacturerRoom);
    console.log(`👥 Clients in ${manufacturerRoom}:`, room ? Array.from(room).length : 0);
    
    // Emit to the room
    io.to(manufacturerRoom).emit('newOrderReceived', {
      orderId: data.orderId,
      wholesalerId: data.wholesalerId,
      itemCount: data.itemCount,
      totalAmount: data.totalAmount,
      timestamp: new Date().toISOString(),
      debug: {
        room: manufacturerRoom,
        clientsCount: room ? Array.from(room).length : 0,
        emittedAt: new Date().toISOString()
      }
    });
    
    console.log(`📢 Sent new order notification to ${manufacturerRoom}`);
  });
  
  socket.on('checkConnection', (userId) => {
    const room = `manufacturer-${userId}`;
    const isInRoom = socket.rooms.has(room);
    
    socket.emit('connectionStatus', {
      userId,
      room,
      isInRoom,
      allRooms: Array.from(socket.rooms),
      timestamp: new Date().toISOString()
    });
    
    console.log(`Connection check for ${userId}:`, {
      room,
      isInRoom,
      socketId: socket.id
    });
  });
  
  // Handle order status updates
  socket.on('orderStatusUpdate', (data) => {
    console.log('🔄 Order status update received:', data);
    
    if (!data || !data.orderId) {
      console.error('❌ Invalid order status update data');
      return;
    }
    
    // Broadcast to relevant room
    if (data.targetWholesalerId) {
      io.to(`wholesaler-${data.targetWholesalerId}`).emit('orderStatusChanged', {
        orderId: data.orderId,
        status: data.status,
        message: data.message,
        timestamp: new Date().toISOString()
      });
      console.log(`📢 Sent status update to wholesaler-${data.targetWholesalerId}`);
    }
  });
  
  // Handle invoice notifications
  socket.on('invoiceSent', (invoiceData) => {
    console.log('🧾 Invoice sent notification:', invoiceData);
    
    if (!invoiceData || !invoiceData.wholesalerId) {
      console.error('❌ Invalid invoice data:', invoiceData);
      return;
    }
    
    const wholesalerId = invoiceData.wholesalerId;
    console.log(`📤 Sending invoice notification to wholesaler-${wholesalerId}`);
    
    io.to(`wholesaler-${wholesalerId}`).emit('invoiceNotification', {
      ...invoiceData,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle new order requests from wholesalers
  socket.on('newOrder', (orderData) => {
    console.log('🆕 New order from wholesaler:', orderData);
    
    if (!orderData || !orderData.manufacturerId) {
      console.error('❌ Invalid order data:', orderData);
      return;
    }
    
    const manufacturerId = orderData.manufacturerId;
    console.log(`📤 Notifying manufacturer-${manufacturerId} about new order`);
    
    io.to(`manufacturer-${manufacturerId}`).emit('orderRequest', {
      ...orderData,
      timestamp: new Date().toISOString()
    });
  });

  // Multi-item order handlers
  socket.on('multiOrderCreated', (data) => {
    console.log('📦 Multi-item order created:', data);
    
    if (!data || !data.manufacturerId) {
      console.error('❌ Invalid multi-order data');
      return;
    }

    // Notify manufacturer
    socket.to(`manufacturer-${data.manufacturerId}`).emit('newMultiOrder', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  // Handle multi-item order updates
  socket.on('multiOrderUpdate', (data) => {
    console.log('🔄 Multi-item order update:', data);
    
    if (!data || !data.wholesalerId) {
      console.error('❌ Invalid multi-order update data');
      return;
    }

    // Notify wholesaler
    socket.to(`wholesaler-${data.wholesalerId}`).emit('multiOrderStatusChange', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  // Handle individual item updates
  socket.on('orderItemUpdate', (data) => {
    console.log('📝 Order item update:', data);
    
    if (!data || !data.wholesalerId) {
      console.error('❌ Invalid item update data');
      return;
    }

    // Notify wholesaler about specific item update
    socket.to(`wholesaler-${data.wholesalerId}`).emit('orderItemStatusChange', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ✅ After the connection handler, continue with your Express routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO running on port ${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️ Database: ${process.env.DB_NAME || 'Not configured'}`);
});