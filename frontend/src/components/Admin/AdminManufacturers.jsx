import React, { useState, useEffect } from 'react';
import { Factory } from "lucide-react";


const AdminManufacturers = () => {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState('');

  // Fetch manufacturers from API
  const fetchManufacturers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Fetching manufacturers from API...');
      
      const response = await fetch('http://localhost:8080/api/admin/manufacturers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 API response data:', data);
      
      if (data.success) {
        setManufacturers(data.manufacturers);
        console.log(`✅ Loaded ${data.manufacturers.length} manufacturers`);
      } else {
        throw new Error(data.message || 'Failed to fetch manufacturers');
      }
    } catch (error) {
      console.error('❌ Error fetching manufacturers:', error);
      setError(`Failed to load manufacturers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // View manufacturer details
  const handleViewDetails = (manufacturer) => {
    setSelectedManufacturer(manufacturer);
    setShowDetailsModal(true);
  };

  // Close details modal
  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedManufacturer(null);
  };

  // Add new manufacturer
  const handleAddManufacturer = () => {
    console.log('Add new manufacturer clicked');
    alert('Add manufacturer functionality would be implemented here');
  };

  // Export data
  const handleExportData = () => {
    if (manufacturers.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Simple CSV export
    const headers = ['Business Name', 'Email', 'CIN/GSTIN', 'State', 'Country', 'Registration Date'];
    const csvData = manufacturers.map(mfg => [
      mfg.businessname,
      mfg.email,
      mfg.cinGstin,
      mfg.state,
      mfg.country,
      new Date(mfg.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manufacturers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchManufacturers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
  <div className="mb-3 text-purple-400">
    <Factory size={32} />
  </div>

  <h3 className="text-lg font-semibold text-white mb-2">Total Manufacturers</h3>

  <p className="text-3xl font-bold text-purple-400">{manufacturers.length}</p>
  
  <p className="text-sm text-gray-400 mt-2">Verified companies</p>
</div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-2xl mb-3">📈</div>
          <h3 className="text-lg font-semibold text-white mb-2">This Month</h3>
          <p className="text-3xl font-bold text-green-400">+8</p>
          <p className="text-sm text-gray-400 mt-2">New registrations</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={fetchManufacturers}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <span>{loading ? '⏳' : '🔄'}</span>
          <span>{loading ? 'Loading...' : 'Refresh Data'}</span>
        </button>
       
      
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-400 mr-2">⚠️</span>
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Manufacturers Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">Registered Manufacturers</h3>
              <p className="text-gray-400 mt-1">
                {loading ? 'Loading...' : `Showing ${manufacturers.length} manufacturers`}
              </p>
            </div>
            {!loading && (
              <div className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-300 mt-2">Loading manufacturers...</p>
          </div>
        ) : manufacturers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    CIN/GSTIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Registered Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {manufacturers.map((manufacturer) => (
                  <tr key={manufacturer.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {manufacturer.businessname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {manufacturer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {manufacturer.cinGstin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {manufacturer.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {manufacturer.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(manufacturer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(manufacturer)}
                        className="text-purple-400 hover:text-purple-300 transition-colors px-3 py-1 border border-purple-600 rounded hover:bg-purple-600"
                        title="View Details"
                      >
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🏭</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No Manufacturers Found</h3>
            <p className="text-gray-400 mb-4">There are no registered manufacturers in the system yet.</p>
            <button 
              onClick={handleAddManufacturer}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add First Manufacturer
            </button>
          </div>
        )}
      </div>

      {/* Details Modal - COMPLETE CONTENT */}
      {showDetailsModal && selectedManufacturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {selectedManufacturer.businessname} - Complete Details
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Company Information Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-600 pb-2">
                  🏢 Company Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Business Name</label>
                    <p className="text-white mt-1 text-lg font-semibold">{selectedManufacturer.businessname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email Address</label>
                    <p className="text-white mt-1">{selectedManufacturer.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">CIN/GSTIN</label>
                    <p className="text-white mt-1 font-mono bg-gray-600 px-2 py-1 rounded">{selectedManufacturer.cinGstin}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">PAN/GST Number</label>
                    <p className="text-white mt-1 font-mono bg-gray-600 px-2 py-1 rounded">{selectedManufacturer.panGstNumber}</p>
                  </div>
                </div>
              </div>

              {/* Location Information Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-600 pb-2">
                  📍 Location Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">State</label>
                    <p className="text-white mt-1">{selectedManufacturer.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Country</label>
                    <p className="text-white mt-1">{selectedManufacturer.country}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Zip Code</label>
                    <p className="text-white mt-1">{selectedManufacturer.zipCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Website</label>
                    <p className="text-white mt-1">
                      {selectedManufacturer.website ? (
                        <a 
                          href={selectedManufacturer.website.startsWith('http') ? selectedManufacturer.website : `https://${selectedManufacturer.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {selectedManufacturer.website}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Address Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-600 pb-2">
                  🏠 Business Address
                </h4>
                <div>
                  <label className="text-sm font-medium text-gray-400">Complete Address</label>
                  <p className="text-white mt-2 bg-gray-600 p-3 rounded-lg whitespace-pre-line">
                    {selectedManufacturer.businessAddress}
                  </p>
                </div>
              </div>

              {/* Document Verification Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-600 pb-2">
                  📄 Document Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Registration Certificate</label>
                    <p className="text-white mt-1">
                      {selectedManufacturer.registrationCertificate ? (
                        <span className="flex items-center text-green-400">
                          <span className="mr-2">✅</span>
                          Uploaded: {selectedManufacturer.registrationCertificate}
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400">
                          <span className="mr-2">❌</span>
                          Not provided
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Business ID Proof</label>
                    <p className="text-white mt-1">
                      {selectedManufacturer.businessIdProof ? (
                        <span className="flex items-center text-green-400">
                          <span className="mr-2">✅</span>
                          Uploaded: {selectedManufacturer.businessIdProof}
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400">
                          <span className="mr-2">❌</span>
                          Not provided
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Registration Details Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-600 pb-2">
                  ⏰ Registration Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Registration Date</label>
                    <p className="text-white mt-1">
                      {new Date(selectedManufacturer.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Registration Time</label>
                    <p className="text-white mt-1">
                      {new Date(selectedManufacturer.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-400">Registration ID</label>
                    <p className="text-white mt-1 font-mono bg-gray-600 px-2 py-1 rounded">
                      {selectedManufacturer.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 text-gray-300 hover:text-white transition-colors border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Edit Manufacturer
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Download Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManufacturers;