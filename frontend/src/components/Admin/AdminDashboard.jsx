import React, { useState } from 'react';

import { Factory, Boxes, Truck, Store } from "lucide-react";
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

 const menuItems = [
  { id: "manufacturer", label: "Manufacturer", icon: <Factory size={20} />, path: "/admin/manufacturers" },
  { id: "wholesaler", label: "Wholesaler", icon: <Boxes size={20} />, path: "/admin/wholesalers" },
  { id: "distributor", label: "Distributor", icon: <Truck size={20} />, path: "/admin/distributors" },
  { id: "retailer", label: "Retailer", icon: <Store size={20} />, path: "/admin/retailers" },
];
  const handleNavigation = (path) => {
    navigate(path);
  };

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find(item => currentPath.includes(item.id));
    return activeItem ? activeItem.id : 'manufacturer';
  };

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find(item => currentPath.includes(item.id));
    return activeItem ? `${activeItem.label} Management` : 'Admin Dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400">Management System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {getPageTitle()}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, Admin</span>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Renders nested routes */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;