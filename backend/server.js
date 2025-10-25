import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import { sendOtpEmail } from "./emailService.js";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "harini2005",
  database: "medicarechain",
});

db.connect((err) => {
  if (err) console.log("❌ Database Connection Failed:", err);
  else console.log("✅ Connected to MySQL Database");
});

// Create uploads directory if not exist
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

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
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Return user data including email
    res.json({ 
      message: "✅ Login successful", 
      user: { 
        id: user.id, 
        fullName: user.fullName, 
        email: user.email,
        role: user.role 
      } 
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
        message: "Database error" 
      });
    }
    
    if (results.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const user = results[0];
    console.log("Stored OTP:", user.otp, "Input OTP:", otp);

    if (user.otp != otp) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP" 
      });
    }
    
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ 
        success: false,
        message: "OTP expired" 
      });
    }

    // Clear OTP after successful verification
    db.query("UPDATE users SET otp = NULL, otp_expiry = NULL WHERE email = ?", [email]);
    
    res.json({ 
      success: true,
      message: "✅ OTP verified successfully!" 
    });
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.send("✅ Backend is running correctly");
});

// 🚀 Start Server
app.listen(8080, () => console.log("Server running at http://localhost:8080"));