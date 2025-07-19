import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CartItem } from '../types/marketplace';

interface CartContextType {
  cart: Record<string, CartItem>;
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'marketplace_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      setIsInitialized(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  const addToCart = (product: CartItem) => {
    setCart(prevCart => ({
      ...prevCart,
      [product.id]: {
        ...product,
        quantity: (prevCart[product.id]?.quantity || 0) + product.quantity
      }
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      delete newCart[productId];
      return newCart;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => ({
      ...prevCart,
      [productId]: {
        ...prevCart[productId],
        quantity
      }
    }));
  };

  const clearCart = () => {
    setCart({});
  };

  // Calculate total items in cart
  const itemCount = Object.values(cart).reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Calculate total price
  const totalPrice = Object.values(cart).reduce(
    (total, item) => total + (item.price_per_unit * item.quantity),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
