import React, { useState } from "react";
import axios from "axios";
import bg from "../assets/bg.png"
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const FeaturesSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
        duration: 0.6
      }
    }
  };

  return (
    <section className="py-20 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Why Choose Medi-Care Chain?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Revolutionizing healthcare logistics with cutting-edge technology and reliable supply chain solutions
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Real-time Tracking */}
          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              y: -8,
              transition: { type: "spring", stiffness: 300 }
            }}
            className="bg-white p-8 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <div className="text-3xl mb-4 text-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Real-time Tracking</h3>
            <p className="text-gray-600">
              Monitor your medical supplies with live GPS tracking and temperature control monitoring
            </p>
          </motion.div>

          {/* Secure Supply Chain */}
          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              y: -8,
              transition: { type: "spring", stiffness: 300 }
            }}
            className="bg-white p-8 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <div className="text-3xl mb-4 text-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Secure Supply Chain</h3>
            <p className="text-gray-600">
              End-to-end encrypted logistics with tamper-proof packaging and secure handling
            </p>
          </motion.div>

          {/* Fast Delivery */}
          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              y: -8,
              transition: { type: "spring", stiffness: 300 }
            }}
            className="bg-white p-8 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <div className="text-3xl mb-4 text-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Fast Delivery</h3>
            <p className="text-gray-600">
              Express delivery options with guaranteed timeframes for critical medical supplies
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Navbar Component (moved outside LandingPage)
const Navbar = ({ toggleModal }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/20 backdrop-blur-md border-b border-white/30 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Company Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
          <span className="text-lg sm:text-xl font-bold text-gray-800">MediVerse</span>
        </div>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center space-x-4 lg:space-x-6">
          <li>
            <a href="#home" className="text-gray-900 hover:text-indigo-700 transition-colors font-medium text-sm lg:text-base">
              Home
            </a>
          </li>
          <li>
            <a href="#about" className="text-gray-900 hover:text-indigo-700 transition-colors font-medium text-sm lg:text-base">
              About Us
            </a>
          </li>
          <li>
            <a href="#contact" className="text-gray-900 hover:text-indigo-700 transition-colors font-medium text-sm lg:text-base">
              Contact
            </a>
          </li>
          <li>
            <button 
              onClick={toggleModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 lg:px-6 lg:py-2 rounded-lg transition-all font-medium text-sm lg:text-base shadow-md hover:shadow-lg"
            >
              Login
            </button>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-2">
          <button 
            onClick={toggleModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-all font-medium text-sm shadow-md hover:shadow-lg mr-2"
          >
            Login
          </button>
          <button
            onClick={toggleMobileMenu}
            className="text-gray-900 hover:text-indigo-700 transition-colors p-2 rounded-lg"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              // Close icon (X)
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-3">
            <a
              href="#home"
              className="block text-gray-900 hover:text-indigo-700 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-indigo-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="#about"
              className="block text-gray-900 hover:text-indigo-700 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-indigo-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About Us
            </a>
            <a
              href="#contact"
              className="block text-gray-900 hover:text-indigo-700 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-indigo-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const toggleModal = () => {
    setShowModal(!showModal);
    if (!showModal) setStep("login");
  };

  // Form Handlers (same as before)
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target);
    const fullName = formData.get("fullName").trim();
    const email = formData.get("email").trim();
    const role = formData.get("role").toLowerCase();
    const phoneNumber = formData.get("phoneNumber").trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(fullName)) {
      alert("Full Name should contain only letters and spaces.");
      setIsLoading(false);
      return;
    }

    if (!email.endsWith("@gmail.com")) {
      alert("Email must be a Gmail address.");
      setIsLoading(false);
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert("Phone number must be 10 digits.");
      setIsLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert("Password must be at least 8 characters long and include both letters and numbers.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/register", {
        fullName,
        email,
        phoneNumber,
        role,
        password,
      });
      if (response.status === 200) {
        localStorage.setItem("userRole", role);
        localStorage.setItem("userData", JSON.stringify({ 
        email: email,
        fullName: fullName,
        role: role 
      }));
      
      alert("Registration successful! Please verify your company.");
      }
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

    if (!email.endsWith("@gmail.com")) {
      alert("Email must be a Gmail address.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/login", { email, password });
      console.log("Server response:", response.data);

      localStorage.setItem("userData", JSON.stringify(response.data.user));
      localStorage.setItem("userRole", response.data.user.role?.toLowerCase());

      const role = response.data.user.role?.toLowerCase();
      navigate(`/${role}/dashboard`);
      setShowModal(false);

    } catch (err) {
      if (err.response?.status === 403) {
        alert("Please verify your company before logging in.");
        localStorage.setItem("userData", JSON.stringify({ email: email }));       
        setStep("verify");
        return;
      }
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
     
    let userData = JSON.parse(localStorage.getItem("userData"));
    let email = userData?.email;

  
  // If no email in localStorage, try to get it from the current form or session
  if (!email) {
    const formData = new FormData(e.target);
    email = formData.get("email"); // In case there's an email field in verify form
  }

  console.log("Verification user email:", email);
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
     // ✅ Get email from localStorage as primary source, fallback to form
  let userData = JSON.parse(localStorage.getItem("userData"));
  let email = userData?.email || formData.get("email");
  
  const otp = formData.get("otp");

  if (!email) {
    alert("No email found. Please start the process again.");
    setIsLoading(false);
    return;
  }
    try {
      const response = await axios.post("http://localhost:8080/api/verify-otp", { email, otp });

      if (response.data.success) {
        alert("✅ OTP Verified Successfully!");
        const role = localStorage.getItem("userRole");
        switch (role) {
          case "manufacturer":
            navigate("/manufacturer/dashboard");
            break;
          case "distributor":
            navigate("/distributor/dashboard");
            break;
          case "wholesaler":
            navigate("/wholesaler/dashboard");
            break;
          case "retailer":
            navigate("/retailer/dashboard");
            break;
          default:
            navigate("/");
        }
        setShowModal(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800">
      {/* Use the Navbar component and pass toggleModal as prop */}
      <Navbar toggleModal={toggleModal} />

      {/* Hero Section with Medical Background */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 bg-cover bg-center bg-no-repeat"
  style={{ backgroundImage: `linear-gradient(rgba(200,200,200,0.3), rgba(255,255,255,0.9)), url(${bg})` }}
>
        <div className="text-center max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-800">
            Your Trusted Partner in 
            <span className="text-indigo-600"> Health Supply Chain</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Delivering secure and efficient medical supply chain solutions<br />
            to connect pharmacies, hospitals, and suppliers worldwide
          </p>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl">
            Explore Our Network
          </button>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/50 shadow-sm">
              <div className="text-4xl font-bold text-indigo-600 mb-2">500+</div>
              <div className="text-gray-700 font-medium">Partner Facilities</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/50 shadow-sm">
              <div className="text-4xl font-bold text-green-600 mb-2">99.8%</div>
              <div className="text-gray-700 font-medium">Delivery Success Rate</div>
            </div>
            <div className="text-center bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/50 shadow-sm">
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-700 font-medium">Supply Chain Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Features Section */}
      <FeaturesSection />

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Medi-Care Chain</h3>
              <p className="text-gray-300">
                Your trusted partner in health supply chain management and logistics solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#home" className="text-gray-300 hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a></li>
                <li><a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                <li><a href="#supply-chain" className="text-gray-300 hover:text-white transition-colors">Supply Chain</a></li>
                <li><a href="#B2B" className="text-gray-300 hover:text-white transition-colors">B2B Solutions</a></li>
                <li><a href="#inventory" className="text-gray-300 hover:text-white transition-colors">Inventory Management</a></li>
                <li><a href="#quality" className="text-gray-300 hover:text-white transition-colors">Quality Control</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <p className="text-gray-300">Email: info@medicarechain.com</p>
              <p className="text-gray-300">Phone: +1 (555) 123-4567</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Medi-Care Chain. All rights reserved. <span className="text-indigo-400">Developed by MarqWon</span></p>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto ${step === "verify" ? "max-w-4xl" : ""} shadow-2xl`}>
            <div className="p-6">
              <button 
                onClick={toggleModal}
                className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors float-right"
              >
                ✕
              </button>

              {/* Login Step */}
              {step === "login" && (
                <div className="clear-both">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Login to Your Account</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <input 
                        type="email" 
                        name="email" 
                        placeholder="Email Address" 
                        required 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        name="password" 
                        placeholder="Password" 
                        autoComplete="current-password" 
                        required 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md"
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </button>
                  </form>
                  <p className="text-gray-600 text-center mt-4">
                    Don't have an account?{" "}
                    <button 
                      onClick={() => setStep("register")}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              )}

              {/* Register Step */}
              {step === "register" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Your Account</h2>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <input 
                      type="text" 
                      name="fullName" 
                      placeholder="Full Name" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Email Address" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input 
                      type="tel" 
                      name="phoneNumber" 
                      placeholder="Phone Number" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <select 
                      name="role" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select Role</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="Password" 
                      autoComplete="new-password" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      placeholder="Confirm Password" 
                      autoComplete="new-password" 
                      required 
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md"
                    >
                      {isLoading ? "Registering..." : "Register"}
                    </button>
                  </form>
                  <p className="text-gray-600 text-center mt-4">
                    Already have an account?{" "}
                    <button 
                      onClick={() => setStep("login")}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Login here
                    </button>
                  </p>
                </div>
              )}

              {/* Verification Step */}
              {step === "verify" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Company Verification</h2>
                  <form onSubmit={handleVerify} className="space-y-6">
                    {/* Business Information */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Information</h3>
                      <div className="space-y-4">
                        <input type="text" name="businessname" placeholder="Business Name" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        <input type="text" name="cinGstin" placeholder="Registration No (CIN / GSTIN)" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        <input type="text" name="panGstNumber" placeholder="PAN / GST Number" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                      </div>
                    </div>

                    {/* Business Address */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Address</h3>
                      <div className="space-y-4">
                        <textarea name="businessAddress" placeholder="Business Address" rows="3" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" name="state" placeholder="State" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                          <input type="text" name="country" placeholder="Country" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" name="zipCode" placeholder="Zip Code" required className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                          <input type="url" name="website" placeholder="Website (optional)" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Document Upload</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2">Business Registration Certificate</label>
                          <input type="file" name="registrationCertificate" accept=".pdf,.jpg,.png,.jpeg" required className="w-full text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">Business ID Proof</label>
                          <input type="file" name="businessIdProof" accept=".pdf,.jpg,.png,.jpeg" required className="w-full text-gray-700" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input type="checkbox" name="agreeTerms" required className="mr-2" />
                      <label className="text-gray-700">I agree to the Terms & Conditions</label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md"
                    >
                      {isLoading ? "Submitting..." : "Submit Verification"}
                    </button>
                  </form>
                </div>
              )}

              {/* OTP Step */}
              {step === "otp" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Email OTP Verification</h2>
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Enter your registered email" 
                      required 
                      defaultValue={JSON.parse(localStorage.getItem("userData"))?.email || ""}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input 
                      type="text" 
                      name="otp" 
                      placeholder="Enter OTP" 
                      required 
                      maxLength="6"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md"
                    >
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;