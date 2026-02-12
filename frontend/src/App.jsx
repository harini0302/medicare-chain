// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage"; // Changed from { LandingPage }

import ManufacturerDashboard from "./components/Manufacturer/ManufacturerDashboard";
import InventoryWithProvider from "./components/Manufacturer/Inventory";
import OrderManagement from "./components/Manufacturer/OrderManagement";
import ManufacturerInvoices from "./components/Manufacturer/Invoices";

import WholesalerCatalog from "./components/Wholesaler/WholesalerCatalog";
import WholesalerDashboard from "./components/Wholesaler/Dashboard";
import WholesalerOrders from "./components/Wholesaler/WholesalerOrders";
import WholesalerInventoryWithProvider from "./components/Wholesaler/WholesalerInventory";

import AdminLogin from "./components/Admin/AdminLogin";
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminManufacturers from "./components/Admin/AdminManufacturers";

import RawMaterialsDashboard from "./components/Rawmaterial.jsx/Rawdashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing Page */}
        <Route path="/" element={<LandingPage />} /> 
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />}>
        <Route index element={<Navigate to="manufacturers" replace />} />
        <Route path="manufacturers" element={<AdminManufacturers />} />
        </Route>
     
        <Route path="/rawmaterial/dashboard" element={<RawMaterialsDashboard />}/>

        
        {/* Manufacturer Routes */}
        <Route path="/manufacturer/dashboard" element={<ManufacturerDashboard />} />
        <Route path="/manufacturer/inventory" element={<InventoryWithProvider />} />
        <Route path="/manufacturer/orders" element={<OrderManagement />} />
        <Route path="/manufacturer/invoices" element={<ManufacturerInvoices />} />

        {/* Wholesaler Routes */}
        <Route path="/wholesaler/dashboard" element={<WholesalerDashboard />} />
        <Route path="/wholesaler/inventory" element={<WholesalerInventoryWithProvider />} />
        <Route path="/wholesaler/catalog" element={<WholesalerCatalog />} />
        <Route path="/wholesaler/orders" element={<WholesalerOrders/>}/>
        
        {/* Catch all route - redirect to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
