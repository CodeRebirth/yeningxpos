import { X, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const { 
    cart, 
    removeFromCart, 
    updateQuantity,
    itemCount,
    totalPrice,
    clearCart
  } = useCart();
  const navigate = useNavigate();
  const cartItems = Object.values(cart);

  const handleCheckout = () => {
    // In a real app, you would navigate to a checkout page
    // For now, we'll just show an alert
    alert('Proceeding to checkout!');
    // Clear cart after checkout
    clearCart();
  };

  if (itemCount === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart ({itemCount} items)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {cartItems.map(item => (
                <div key={item.id} className="p-4 flex">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex-1 flex flex-col">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          ${item.price_per_unit.toFixed(2)} / {item.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 flex items-end justify-between">
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-3">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-lg font-medium">
                        ${(item.price_per_unit * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={handleCheckout}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Proceed to Checkout
              </button>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate('/marketplace')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
