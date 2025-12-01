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

// Load environment variables
dotenv.config();

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

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
// Create uploads directory if not exist
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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

// Email service function (you'll need to implement this)
const sendOtpEmail = async (email, otp, businessName) => {
  console.log(`📧 Sending OTP ${otp} to ${email} for ${businessName}`);
  // Implement your email sending logic here
  return Promise.resolve();
};

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
    user_email // Add this field to link to company
  } = req.body;

  // File path (store only filename or relative path)
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  console.log("Processing medicine data:", {
    sku, name, user_email, image: req.file ? req.file.filename : 'No image'
  });

  // Check if user_email is provided
  if (!user_email) {
    console.error("No user_email provided in request");
    return res.status(400).json({ 
      message: "User email is required. Please make sure you're logged in." 
    });
  }

  // First, get the company ID based on user email
  const getCompanySql = "SELECT id FROM company_verification WHERE email = ?";
  db.query(getCompanySql, [user_email], (err, companyResults) => {
    if (err) {
      console.error("Error fetching company:", err);
      return res.status(500).json({ message: "Failed to fetch company data" });
    }

    if (companyResults.length === 0) {
      console.error("No company found for email:", user_email);
      return res.status(400).json({ 
        message: "Company not found for this email. Please complete company verification first." 
      });
    }

    const company_id = companyResults[0].id;
    console.log("Found company ID:", company_id, "for email:", user_email);

    const sql = `
      INSERT INTO products
      (sku, name, description, unit, unit_price, tax_rate, mfg_date, expiry_date, category, stock_qty, status, image, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [sku, name, description, unit, unit_price, tax_rate, mfg_date, expiry_date, category, stock_qty, status, image, company_id],
      (err, result) => {
        if (err) {
          console.error("Error adding medicine:", err);
          return res.status(500).json({ message: "Failed to add medicine" });
        }

        console.log("Medicine added successfully with ID:", result.insertId);
        
        // Return the complete medicine data including the image path
        res.status(201).json({
          id: result.insertId,
          sku,
          name,
          description,
          unit,
          unit_price: parseFloat(unit_price),
          tax_rate: parseFloat(tax_rate),
          mfg_date,
          expiry_date,
          category,
          stock_qty: parseInt(stock_qty),
          status,
          image: image,
          company_id,
          message: "✅ Medicine added successfully with image"
        });
      }
    );
  });
});

// ✏️ Update existing product
app.put("/api/medicines/:id", (req, res) => {
  const { id } = req.params;
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
  } = req.body;

  const sql = `
    UPDATE products 
    SET sku=?, name=?, description=?, unit=?, unit_price=?, tax_rate=?, 
        mfg_date=?, expiry_date=?, category=?, stock_qty=?, status=? 
    WHERE id=?
  `;

  db.query(sql, [sku, name, description, unit, unit_price, tax_rate, mfg_date, expiry_date, category, stock_qty, status, id], (err) => {
    if (err) {
      console.error("❌ Error updating medicine:", err);
      return res.status(500).json({ message: "Failed to update medicine" });
    }
    res.json({ message: "✏️ Medicine updated successfully" });
  });
});

// 🗑️ Delete product
app.delete("/api/medicines/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM products WHERE id=?", [id], (err) => {
    if (err) {
      console.error("❌ Error deleting medicine:", err);
      return res.status(500).json({ message: "Failed to delete medicine" });
    }
    res.json({ message: "🗑️ Medicine deleted successfully" });
  });
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
app.get("/api/medicines/company/:companyName", (req, res) => {
  const { companyName } = req.params;
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
});
// ✅ Get all wholesalers (for admin)
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
      cv.country,
      u.createdAt
    FROM users u
    LEFT JOIN company_verification cv ON u.email = cv.email
    WHERE u.role = 'wholesaler'
    ORDER BY u.createdAt DESC
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

// ================================
// 📦 IMPORTED ROUTES
// ================================
app.use("/api/orders", orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // 🆕 Add test event handler
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
    console.log(`Manufacturer ${manufacturerId} joined room`);
  });
  
  // Wholesaler joins their room  
  socket.on('join-wholesaler', (wholesalerId) => {
    socket.join(`wholesaler-${wholesalerId}`);
    console.log(`Wholesaler ${wholesalerId} joined room`);
  });
  
// In your backend (server.js) - Update the orderUpdate handler:

// Broadcast order updates to specific wholesaler
socket.on('orderUpdate', (data) => {
  console.log('📤 Broadcasting order update to wholesaler:', data);
  
  // First, get the wholesaler_id for this order from the database
  const getWholesalerSql = `SELECT wholesaler_id FROM orders WHERE order_id = ?`;
  
  db.query(getWholesalerSql, [data.orderId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching wholesaler ID:', err);
      return;
    }
    
    if (results.length > 0) {
      const wholesalerId = results[0].wholesaler_id;
      console.log(`🎯 Sending order update to wholesaler: ${wholesalerId}`);
      
      // Emit to the specific wholesaler who placed the order
      io.to(`wholesaler-${wholesalerId}`).emit('orderUpdate', {
        ...data,
        targetWholesalerId: wholesalerId
      });
      
      console.log(`✅ Order update sent to wholesaler-${wholesalerId}`);
    } else {
      console.warn('⚠️ No wholesaler found for order:', data.orderId);
    }
  });
});
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});
// Add this to your server.js
app.get("/api/users/:userId/verification-status", (req, res) => {
  const userId = req.params.userId;
  
  const sql = `
    SELECT 
      u.id,
      u.role,
      u.is_verified as userVerified,
      cv.id as companyVerificationId,
      cv.businessname
    FROM users u
    LEFT JOIN company_verification cv ON u.email = cv.email
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = results[0];
    const isCompanyVerified = !!user.companyVerificationId;
    
    res.json({
      success: true,
      userVerified: user.userVerified,
      companyVerified: isCompanyVerified,
      hasBusinessName: !!user.businessname,
      role: user.role
    });
  });
});
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO running on port ${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️ Database: ${process.env.DB_NAME || 'Not configured'}`);
});