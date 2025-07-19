
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderItem } from '@/types/pos';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  Loader2, 
  Receipt, 
  ShoppingCart 
} from 'lucide-react';

interface OrderSummaryProps {
  orderItems: OrderItem[];
  tableNumber: string;
  setTableNumber: (value: string) => void;
  customerName: string;
  setCustomerName: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  calculateTotal: () => number;
  calculateTax: () => number;
  handlePayment: () => void;
  resetOrder: () => void;
  isSubmitting: boolean;
  className?: string;
  isOpen?: boolean;
  toggleSummary?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderItems,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  phoneNumber,
  setPhoneNumber,
  paymentMethod,
  setPaymentMethod,
  updateQuantity,
  calculateTotal,
  calculateTax,
  handlePayment,
  resetOrder,
  isSubmitting,
  className,
  isOpen = true,
  toggleSummary
}) => {
  const [formCollapsed, setFormCollapsed] = useState(false);
  const hasItems = orderItems.length > 0;
  const { settings } = useSettings(); // Get settings including tax_rate
  
  // Track if the user has manually toggled the form
  const userToggledRef = useRef(false);
  
  // Auto-collapse the form when items are added, but only if user hasn't manually toggled
  useEffect(() => {
    // Only auto-collapse if the user hasn't manually toggled
    if (hasItems && !formCollapsed && !userToggledRef.current) {
      setFormCollapsed(true);
    } else if (!hasItems) {
      // Reset user toggle tracking when cart is empty
      userToggledRef.current = false;
      // Always expand the form when there are no items
      if (formCollapsed) {
        setFormCollapsed(false);
      }
    }
  }, [hasItems, formCollapsed]);

  // Handle manual toggle
  const toggleFormCollapse = () => {
    userToggledRef.current = true; // Mark that user has manually toggled
    setFormCollapsed(!formCollapsed);
  };


  // Mobile cart indicator
  const CartIndicator = () => (
    <div className="fixed bottom-4 right-4 lg:hidden z-20">
      <Button 
        onClick={toggleSummary} 
        className="h-14 w-14 rounded-full bg-viilare-500 hover:bg-viilare-600 shadow-lg flex items-center justify-center"
      >
        <ShoppingCart className="h-6 w-6" />
        {hasItems && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </Button>
    </div>
  );

  return (
    <>
      {/* Only show the cart indicator when the summary is not visible */}
      {!isOpen && <CartIndicator />}
      
      {/* Overlay to close when tapping outside on mobile */}
      {isOpen && toggleSummary && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-[5] lg:hidden"     
          onClick={toggleSummary}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={cn(
          "fixed lg:relative h-full right-0 top-0 w-[80%] lg:w-auto max-w-[400px] flex flex-col bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-10 order-summary-tablet",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Current Order</h2>
          {toggleSummary && (
            <Button variant="ghost" size="sm" onClick={toggleSummary} className="lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </Button>
          )}
        </div>
        
        {/* Order details section */}
        <div className={cn(
          "border-b border-gray-200 transition-all duration-300 overflow-hidden",
          formCollapsed ? "max-h-12" : "max-h-[200px]"
        )}>
          <div 
            className="p-4 cursor-pointer flex justify-between items-center"
            onClick={toggleFormCollapse}
          >
            <h3 className="font-medium">Order Details</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1"
              onClick={(e) => {
                e.stopPropagation(); // Prevent the parent onClick from firing
                toggleFormCollapse();
              }}
            >
              {formCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className={cn(
            "px-4 pb-4 transition-opacity",
            formCollapsed ? "opacity-0" : "opacity-100"
          )}>
            {/* Order details - compact form */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Table:</label>
                <Input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-viilare-50 h-8 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone:</label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-viilare-50 h-8 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name:</label>
                <Input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-viilare-50 h-8 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Order items - scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" hideScrollbar={false}>
            <div className="p-4">
              <h3 className="font-medium text-gray-700 mb-2">Order Items</h3>
              {!hasItems ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">No items in order</p>
                  <p className="text-sm text-gray-400">Click on menu items to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map(item => (
                    <div 
                      key={item.productId} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-500">₹{item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center">
                        <button
                          className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mx-3 font-medium">{item.quantity}</span>
                        <button
                          className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Order summary and payment - fixed at bottom */}
        <div className="p-4 border-t border-gray-200">
          {/* Order summary */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax {settings.tax_rate}%</span>
              <span className="font-medium">₹{calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₹{(calculateTotal() + calculateTax()).toFixed(2)}</span>
            </div>
          </div>
          
          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method:</label>
            <RadioGroup 
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <label htmlFor="cash" className="flex items-center">
                  <Receipt className="h-4 w-4 mr-1" />
                  Cash
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <label htmlFor="card" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Card
                </label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={resetOrder} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              className="bg-viilare-500 hover:bg-viilare-600 text-white"
              onClick={handlePayment}
              disabled={orderItems.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : 'Pay'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderSummary;
