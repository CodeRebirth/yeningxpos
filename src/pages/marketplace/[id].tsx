import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { Product } from '../../types/marketplace';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      // Get current cart from local storage or create new one
      const cart = JSON.parse(localStorage.getItem('marketplace_cart') || '{}');
      
      // Update cart
      cart[product.id] = {
        ...product,
        quantity: (cart[product.id]?.quantity || 0) + quantity
      };
      
      // Save back to local storage
      localStorage.setItem('marketplace_cart', JSON.stringify(cart));
      
      // Show success message
      alert('Product added to cart!');
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-center py-12">Product not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
      >
        ← Back to Marketplace
      </button>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-6">
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-gray-400">No image available</span>
              )}
            </div>
          </div>
          
          <div className="md:w-1/2 p-6">
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-2xl font-semibold text-blue-600 mb-6">
              ${product.price_per_unit.toFixed(2)}
              {product.unit && <span className="text-lg text-gray-500"> / {product.unit}</span>}
            </p>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">
                {product.description || 'No description available'}
              </p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Product Details</h2>
              <ul className="space-y-2">
                <li><span className="font-medium">Category:</span> {product.category || 'N/A'}</li>
                <li><span className="font-medium">In Stock:</span> {product.stock_quantity} {product.unit || 'units'}</li>
                <li><span className="font-medium">Minimum Order:</span> {product.min_order_quantity} {product.unit || 'units'}</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center border rounded">
                <button 
                  className="px-3 py-1 text-xl"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className="px-4 py-1">{quantity}</span>
                <button 
                  className="px-3 py-1 text-xl"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className={`px-6 py-2 rounded-md text-white font-medium ${
                  addingToCart ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Free shipping on orders over $100</p>
              <p>30-day return policy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
