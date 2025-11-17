import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api/apiConfig";

// Add this helper function
const getImageUrl = (imagePath) => {
  if (!imagePath || imagePath === 'No image' || imagePath === 'NULL') return null;
  
  // If it's already a full URL
  if (imagePath.startsWith('http')) return imagePath;
  
  // If it's a blob URL (for previews)
  if (imagePath.startsWith('blob:')) return imagePath;
  
  // If it's a relative path, construct full URL
  if (imagePath.startsWith('/')) {
    return `http://localhost:8080${imagePath}`;
  }
  
  // If it's just a filename, construct path
  return `http://localhost:8080/uploads/${imagePath}`;
};

const WholesalerCatalog = () => {
  const [companyName, setCompanyName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!companyName.trim()) return alert("Please enter a company name");

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/medicines/company/${companyName}`);
      console.log("Catalog API response:", res.data);
      
      // Debug: Check image data in first product
      if (res.data.length > 0) {
        console.log("First product image data:", res.data[0].image);
        console.log("Processed image URL:", getImageUrl(res.data[0].image));
      }
      
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // Handle image loading errors
  const handleImageError = (e, product) => {
    console.error(`Image failed to load for ${product.name}:`, product.image);
    console.error("Processed URL was:", e.target.src);
    e.target.style.display = 'none';
  };

  const handleImageLoad = (e, product) => {
    console.log(`✅ Image loaded successfully for ${product.name}:`, e.target.src);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">🔍 Search Manufacturer Catalog</h1>
        <div className="flex justify-center items-center space-x-4">
          <input
            type="text"
            placeholder="Enter company name..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="border border-gray-600 bg-gray-800 text-white rounded-lg px-4 py-2 w-80 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-400 mb-4">Loading products...</div>
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const imageUrl = getImageUrl(product.image);
            
            return (
              <div
                key={product.id}
                className="bg-gray-800 shadow-lg rounded-xl p-4 border border-gray-700 hover:border-purple-500 hover:shadow-xl transition-all duration-300"
              >
                {/* Image Section */}
                <div className="relative h-48 mb-4 bg-gray-700 rounded-lg overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageError(e, product)}
                      onLoad={(e) => handleImageLoad(e, product)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-600">
                      <div className="text-center text-gray-400">
                        <div className="text-3xl mb-2">💊</div>
                        <span className="text-sm">No Image</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <h2 className="text-lg font-semibold text-white mb-2">
                  {product.name}
                </h2>
                
                {product.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 font-bold text-lg">
                      ${parseFloat(product.unit_price || 0).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                      {product.stock_qty} units
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    <span className="font-medium text-gray-300">Category:</span> {product.category}
                  </p>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      <span className="font-medium">Mfg:</span> {product.mfg_date?.split("T")[0]}
                    </span>
                    <span>
                      <span className="font-medium">Exp:</span> {product.expiry_date?.split("T")[0]}
                    </span>
                  </div>
                  
                  <p className="text-sm text-purple-300 font-medium pt-2 border-t border-gray-700">
                    {product.businessName || product.company_name} — {product.state}, {product.country}
                  </p>
                </div>

                {/* Debug info - remove after testing */}
                <div className="mt-3 p-2 bg-yellow-900 bg-opacity-20 rounded text-xs text-yellow-200">
                  <div>Image: {product.image || 'No image data'}</div>
                  <div>Processed: {imageUrl || 'No URL'}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg">
              {companyName ? "No products found for this company" : "Enter a company name to search"}
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default WholesalerCatalog;