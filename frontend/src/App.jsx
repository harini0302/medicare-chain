// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage"; // Changed from { LandingPage }
import ManufacturerDashboard from "./components/Manufacturer/ManufacturerDashboard";
import Inventory from "./components/Manufacturer/Inventory";
import WholesalerCatalog from "./components/Wholesaler/WholesalerCatalog";
import AdminLogin from "./components/Admin/AdminLogin";
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminManufacturers from "./components/Admin/AdminManufacturers";
import WholesalerDashboard from "./components/Wholesaler/Dashboard";
import WholesalerInventory from "./components/Wholesaler/WholesalerInventory";
import InventoryWithProvider from "./components/Manufacturer/Inventory";
import WholesalerInventoryWithProvider from "./components/Wholesaler/WholesalerInventory";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing Page */}
        <Route path="/" element={<LandingPage />} /> {/* This should now work */}
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />}>
          <Route index element={<Navigate to="manufacturers" replace />} />
          <Route path="manufacturers" element={<AdminManufacturers />} />
        </Route>
        
        {/* Manufacturer Routes */}
        <Route path="/manufacturer/dashboard" element={<ManufacturerDashboard />} />
        <Route path="/manufacturer/inventory" element={<InventoryWithProvider />} />
        
        {/* Wholesaler Routes */}
        <Route path="/wholesaler/dashboard" element={<WholesalerDashboard />} />
        <Route path="/wholesaler/inventory" element={<WholesalerInventoryWithProvider />} />
        <Route path="/wholesaler/catalog" element={<WholesalerCatalog />} />
        
        {/* Catch all route - redirect to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
