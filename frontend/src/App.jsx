import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import ManufacturerDashboard from "./components/Manufacturer/ManufacturerDashboard";
import Inventory from "./components/Manufacturer/Inventory";
import WholesalerCatalog from "./components/Wholesaler/WholesalerCatalog";
import AdminLogin from "./components/Admin/AdminLogin";
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminManufacturers from "./components/Admin/AdminManufacturers";
// import AdminWholesalers from "./components/Admin/AdminWholesalers";
// import AdminDistributors from "./components/Admin/AdminDistributors";
// import AdminRetailers from "./components/Admin/AdminRetailers";
import ProtectedRoute from "./components/Admin/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

      
        <Route path="/admin/dashboard" element={<AdminDashboard />}>
        <Route index element={<Navigate to="manufacturers" replace />} />
        <Route path="manufacturers" element={<AdminManufacturers />} />
          {/* <Route path="wholesalers" element={<AdminWholesalers />} />
          <Route path="distributors" element={<AdminDistributors />} />
          <Route path="retailers" element={<AdminRetailers />} /> */}
        </Route>

        {/* Role-Based Dashboards */}
        <Route path="/manufacturer/dashboard" element={<ManufacturerDashboard />} />
        <Route path="/manufacturer/inventory" element={<Inventory />} />
        <Route path="/wholesaler/catalog" element={<WholesalerCatalog />} />
        {/* <Route path="/distributor/dashboard" element={<DistributorDashboard />} />
        <Route path="/wholesaler/dashboard" element={<WholesalerDashboard />} />
        <Route path="/retailer/dashboard" element={<RetailerDashboard />} /> */}

        {/* Redirect for /admin to /admin/login */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;