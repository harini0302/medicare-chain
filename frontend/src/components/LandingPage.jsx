import React, { useState } from "react";
import axios from "axios";
import landing from "../assets/landing.png";
import logo from "../assets/logo.png";
import "../styles/LandingPage.css";

const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState("login"); // 'login', 'register', 'verify'
  const [isLoading, setIsLoading] = useState(false);

  const toggleModal = () => {
    setShowModal(!showModal);
    if (!showModal) setStep("login"); // Reset to login when opening modal
  };

  // ---- Form Handlers ----
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target);
    const fullName = formData.get("fullName");
    const email = formData.get("email");
    const role=formData.get("role");
    const phoneNumber = formData.get("phoneNumber");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/register", {
        fullName,
        email,
        phoneNumber,
        role,
        password,
      });
      setStep("login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

 const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  
  const formData = new FormData(e.target);
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const response = await axios.post("http://localhost:8080/api/login", { 
      email, 
      password 
    });
    
    // Store token and user data properly
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      // Make sure the backend returns user data with email
      localStorage.setItem("user", JSON.stringify({
        email: email, // Explicitly store email
        ...response.data.user
      }));
      console.log("Stored user:", { email, ...response.data.user });
    } else {
      // If no token, still store the email
      localStorage.setItem("user", JSON.stringify({ email }));
    }
    
    setStep("verify");
  } catch (err) {
    alert(err.response?.data?.message || "Login failed");
  } finally {
    setIsLoading(false);
  }
};
  const handleVerify = async (e) => {
  e.preventDefault();
  setIsLoading(true);
   
  // Retrieve email from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const email = user?.email;

  console.log("Logged-in user email:", email);
  
  if (!email) {
    alert("No user email found. Please log in again.");
    setIsLoading(false);
    return;
  }

  const formData = new FormData(e.target);
  formData.append("email", email); 

  try {
    const response = await axios.post("http://localhost:8080/api/verify-company", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    console.log("Server response:", response.data);

    if (response.data.success) {
      alert(response.data.message);
      setStep("otp");
    } else {
      alert(response.data.message);
    }
  } catch (err) {
    console.error("Verification error:", err);
    alert(err.response?.data?.message || "Verification failed");
  } finally {
    setIsLoading(false);
  }
};
const handleOtpVerify = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  const formData = new FormData(e.target);
  const email = formData.get("email");
  const otp = formData.get("otp");

  try {
    const response = await axios.post("http://localhost:8080/api/verify-otp", { email, otp });
    if (response.data.success) {
      alert("✅ OTP Verified Successfully!");
      setShowModal(false);
      setStep("login");
    } else {
      alert("Invalid OTP, please try again.");
    }
  } catch (err) {
    alert(err.response?.data?.message || "OTP verification failed");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo-section">
          <img src={logo} alt="Company Logo" className="logo-img" />
          <span className="company-name">Medi-Care Chain</span>
        </div>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About Us</a></li>
          <li><a href="#contact">Contact</a></li>
          <li>
            <button className="login-register" onClick={toggleModal}>
              Login
            </button>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero" >
        <div className="hero-content">
          <h1>
            Your Trusted Partner in Health
          </h1>
          <p>
            Delivering secure and efficient medical supply chain<br />
            solutions to connect pharmacies, hospitals, and suppliers
          </p>
          <button className="cta-button">Explore Now</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Medi-Care Chain</h3>
            <p>Your trusted partner in health supply chain management.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li><a href="#supply-chain">Supply Chain</a></li>
              <li><a href="#inventory">Inventory Management</a></li>
              <li><a href="#distribution">Distribution</a></li>
              <li><a href="#quality">Quality Control</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact Info</h4>
            <p>Email: info@medicarechain.com</p>
            <p>Phone: +1 (555) 123-4567</p>
            <p>Address: 123 Health Street, Medical City</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Medi-Care Chain. All rights reserved.</p>
        </div>
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal-box ${step === "verify" ? "verification-modal" : ""}`}>
            <button className="close-btn" onClick={toggleModal}>✕</button>

            {/* --- Step: Login --- */}
            {step === "login" && (
              <div className="modal-content">
                <h2>Login to Your Account</h2>
                <form onSubmit={handleLogin} className="auth-form">
                  <div className="form-group">
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Email Address" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="Password" 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                </form>
                <p className="auth-switch">
                  Don't have an account?{" "}
                  <span 
                    className="link-text" 
                    onClick={() => setStep("register")}
                  >
                    Register here
                  </span>
                </p>
              </div>
            )}

            {/* --- Step: Register --- */}
            {step === "register" && (
              <div className="modal-content">
                <h2>Create Your Account</h2>
                <form onSubmit={handleRegister} className="auth-form">
                  <div className="form-group">
                    <input 
                      type="text" 
                      name="fullName" 
                      placeholder="Full Name" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Email Address" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="tel" 
                      name="phoneNumber" 
                      placeholder="Phone Number" 
                      required 
                    />
                  </div>
                  <div>
                  <select name="role"  className="role-select" required>
                    <option value="">Select Role</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Retailer">Retailer</option>
                  </select></div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="Password" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      placeholder="Confirm Password" 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registering..." : "Register"}
                  </button>
                </form>
                <p className="auth-switch">
                  Already have an account?{" "}
                  <span 
                    className="link-text" 
                    onClick={() => setStep("login")}
                  >
                    Login here
                  </span>
                </p>
              </div>
            )}

{step === "verify" && (
  <div className="modal-content verification-content">
    <h2 className="verification-title">Company Verification</h2>
    <form onSubmit={handleVerify} className="verification-form">
      {/* Business Information Section */}
      <div className="form-section">
        <h3 className="form-section-title">Business Information</h3>
         
         <div className="form-group">
          <label htmlFor="Businessname">Business Name</label>
          <input 
            type="text" 
            id="businessname"
            name="businessname" 
            placeholder="Enter Business Name" 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="cinGstin">Registration No (CIN / GSTIN)</label>
          <input 
            type="text" 
            id="cinGstin"
            name="cinGstin" 
            placeholder="Enter CIN or GSTIN" 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="panGstNumber">PAN / GST Number</label>
          <input 
            type="text" 
            id="panGstNumber"
            name="panGstNumber" 
            placeholder="Enter PAN or GST number" 
            required 
          />
        </div>
      </div>

      {/* Address Information Section */}
      <div className="form-section">
        <h3 className="form-section-title">Business Address</h3>
        
        <div className="form-group">
          <label htmlFor="businessAddress">Business Address</label>
          <textarea 
            id="businessAddress"
            name="businessAddress" 
            placeholder="Enter complete business address" 
            rows="3"
            required 
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input 
              type="text" 
              id="state"
              name="state" 
              placeholder="Enter state" 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input 
              type="text" 
              id="country"
              name="country" 
              placeholder="Enter country" 
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="zipCode">Zip Code</label>
            <input 
              type="text" 
              id="zipCode"
              name="zipCode" 
              placeholder="Enter zip code" 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="website">Website (optional)</label>
            <input 
              type="url" 
              id="website"
              name="website" 
              placeholder="Enter website" 
            />
          </div>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="form-section">
        <h3 className="form-section-title">Document Upload</h3>
        
        <div className="file-input-group">
          <label htmlFor="registrationCertificate">Business Registration Certificate</label>
          <div className="file-input-wrapper">
            <input 
              type="file" 
              id="registrationCertificate"
              name="registrationCertificate" 
              accept=".pdf,.jpg,.png,.jpeg" 
              required 
              onChange={(e) => {
                const fileName = e.target.files[0]?.name || 'No file chosen';
                e.target.nextElementSibling.querySelector('.file-input-text').textContent = fileName;
              }}
            />
            <label htmlFor="registrationCertificate" className="file-input-label">
              <span className="file-input-text">No file chosen</span>
              <span className="file-input-button">Browse</span>
            </label>
          </div>
        </div>

        <div className="file-input-group">
          <label htmlFor="businessIdProof">Business ID Proof</label>
          <div className="file-input-wrapper">
            <input 
              type="file" 
              id="businessIdProof"
              name="businessIdProof" 
              accept=".pdf,.jpg,.png,.jpeg" 
              required 
              onChange={(e) => {
                const fileName = e.target.files[0]?.name || 'No file chosen';
                e.target.nextElementSibling.querySelector('.file-input-text').textContent = fileName;
              }}
            />
            <label htmlFor="businessIdProof" className="file-input-label">
              <span className="file-input-text">No file chosen</span>
              <span className="file-input-button">Browse</span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input type="checkbox" name="agreeTerms" required />
          <span>I agree to the Terms & Conditions</span>
        </label>
      </div>

      <button 
        type="submit" 
        className="submit-btn verification-submit"
        disabled={isLoading}
      >
        {isLoading ? "Submitting..." : "Submit Verification"}
      </button>
    </form>
  </div>
)}

{step === "otp" && (
  <div className="modal-content">
    <h2>Email OTP Verification</h2>
    <form onSubmit={handleOtpVerify} className="auth-form">
      <div className="form-group">
        <input 
          type="email" 
          name="email" 
          placeholder="Enter your registered email" 
          required 
          defaultValue={JSON.parse(localStorage.getItem("user"))?.email || ""}
        />
      </div>
      <div className="form-group">
        <input 
          type="text" 
          name="otp" 
          placeholder="Enter OTP" 
          required 
          maxLength="6"
        />
      </div>
      <button 
        type="submit" 
        className="submit-btn"
        disabled={isLoading}
      >
        {isLoading ? "Verifying..." : "Verify OTP"}
      </button>
    </form>
  </div>
)}
         </div>
      </div>
      )}
    </div>
  );
};

export default LandingPage;