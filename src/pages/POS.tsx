import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import OrderSummary from '@/components/pos/OrderSummary';
import ReceiptDialog from '@/components/pos/ReceiptDialog';
import ProductCard from '@/components/pos/ProductCard';
import { Product, OrderItem, Category, ReceiptDataType } from '@/types/pos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuthContext } from '@/context/AuthContext';
import useAppStore from '@/lib/zustand/appStateStore';
import { useNavigate } from 'react-router-dom';

const POS = () => {
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptDataType | null>(null);
  // Make the summary visible by default on desktop, but hidden on mobile
  const [summaryOpen, setSummaryOpen] = useState(window.innerWidth >= 768);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { settings } = useSettings(); // Get settings including tax_rate
  const { session } = useAuthContext(); // Get the current user to access user_id
  const { userData } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
        if (!session) {
          // If authenticated, redirect to Dashboard
         navigate('/login');
        }
    }, []);

  // Handle window resize to adjust summary visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSummaryOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch products and categories from Supabase
  useEffect(() => {
    if (!userData?.business_id) return; // Wait for business_id to be available
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch categories first
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', userData?.business_id);

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          throw categoriesError;
        }

        // Set categories if successful
        if (categoriesData) {
          setCategories(categoriesData);
        }

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, description, price, category, image_url')
          .eq('in_stock', true)
          .eq('business_id', userData?.business_id);

        if (productsError) {
          throw productsError;
        }

        if (productsData) {
          setProducts(productsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Error toast handled in the guidance useEffect below
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, userData?.business_id]);
  
  // Show guidance toast only for new users (first visit)
  useEffect(() => {
    // Only run this effect once when data is first loaded
    if (!isLoading) {
      // Case 1: Error loading data
      if (categories === undefined || products === undefined) {
        toast({
          title: "Error loading data",
          description: "Failed to load products or categories. Please try again.",
          variant: "destructive",
        });
      }
      // Case 2: No categories at all - direct to inventory setup
      else if (categories.length === 0) {
        toast({
          title: "Welcome to POS",
          description: "To get started, please set up your product categories in the Inventory section.",
          variant: "default",
          className: "bg-orange-300 border-orange-50",
          duration: 6000,
        });
        // Mark as visited
        
      }
      // Case 3: Has categories but no products
      else if (products.length === 0) {
        toast({
          title: "Add your first product",
          description: "Your categories are set up. Now add products to start using the POS system.",
          variant: "default",
          className: "bg-green-50 border-green-50 text-green-800",
          duration: 5000,
        });
        // Mark as visited
        
      } else {
        // If they have data, just mark as visited without showing toast
        
      }
    }
  }, [isLoading, categories, products, toast]);

  // Get a category name from its ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const filteredProducts = React.useMemo(() => {
    let filtered = [...products];

    // Filter by category if not "All Items"
    if (activeCategory !== 'All Items') {
      // Find the category object that matches the active category name
      const selectedCategory = categories.find(cat => cat.name === activeCategory);

      if (selectedCategory) {
        // Filter products where the product's category ID matches the selected category's ID
        filtered = filtered.filter(product => product.category === selectedCategory.id);
      }
    }

    // Filter by search query if present
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, categories, activeCategory, searchQuery]);

  // Check if a product is in the cart
  const isProductInCart = (productId: string) => {
    return orderItems.some(item => item.productId === productId);
  };

  // Get quantity of a product in the cart
  const getProductQuantity = (productId: string) => {
    const item = orderItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id);

    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);

      // Open the summary on mobile when adding first item
      if (orderItems.length === 0 && window.innerWidth < 768) {
        setSummaryOpen(true);
      }
    }

    // toast({
    //   title: "Item added",
    //   description: `${product.name} has been added to the order.`,
    // });
  };

  const removeFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromOrder(productId);
      return;
    }

    setOrderItems(orderItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateTotal() * (settings.tax_rate / 100); // Use tax rate from settings
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `ORD-${year}${month}${day}-${random}`;
  };

  const handlePayment = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Empty order",
        description: "Please add items to the order before proceeding to payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Process order
      const orderNumber = generateOrderNumber();
      const subtotal = calculateTotal();
      const taxAmount = calculateTax();
      const totalAmount = subtotal + taxAmount;

      // Get the business ID (admin's user_id)
      let businessId = userData?.business_id; // Default to user's ID (for admin)
      
      
      if (!businessId) {
        throw new Error('User ID not available. Please log in again.');
      }
      
      // console.log('Creating order with business ID:', businessId);
      
      // Save order to database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName || 'Guest',
          customer_phone: phoneNumber || null,
          subtotal,
          business_id: businessId, // Use the admin's user_id as business_id
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: 'paid',
          order_status: 'completed',
          notes: tableNumber ? `Table: ${tableNumber}` : '',
          user_id: userData?.userId,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        const orderId = orderData.id;

        // Format order items for database
        const orderItemsData = orderItems.map(item => ({
          order_id: orderId,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          tax_rate: settings.tax_rate / 100, // Use tax rate from settings
          total_price: item.price * item.quantity
        }));

        // Add business_id to each order item
        const orderItemsWithBusinessId = orderItemsData.map(item => ({
          ...item,
          business_id: businessId // Add the same business_id to each order item
        }));
        
        // Save order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsWithBusinessId);

        if (itemsError) throw itemsError;

        // Save transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            order_id: orderId,
            transaction_type: 'payment',
            amount: totalAmount,
            payment_method: paymentMethod,
            status: 'successful',
            reference_number: `TRX-${orderNumber}`
          });

        if (transactionError) throw transactionError;

        // Set receipt data for the dialog
        setReceiptData({
          orderId,
          orderNumber,
          orderDate: new Date().toLocaleDateString(),
          orderTime: new Date().toLocaleTimeString(),
        });

        toast({
          title: "Payment successful",
          description: `Order #${orderNumber} has been processed.`,
        });

        // Show receipt dialog
        setShowReceiptDialog(true);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment failed",
        description: "An error occurred while processing the payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrder = () => {
    setOrderItems([]);
    setTableNumber('');
    setCustomerName('');
    setPhoneNumber('');
    setPaymentMethod('cash');
    setShowReceiptDialog(false);
    setReceiptData(null);
    setSearchQuery(''); // Reset search query
    setActiveCategory('All Items'); // Reset to default category

    // Don't close the summary on desktop
    if (window.innerWidth < 768) {
      setSummaryOpen(false);
    }
  };

  // Handle receipt dialog close with reset
  const handleReceiptDialogClose = () => {
    setShowReceiptDialog(false);
    resetOrder(); // Reset the order when receipt dialog is closed
  };

  // Toggle summary visibility on mobile
  const toggleSummary = () => {
    setSummaryOpen(!summaryOpen);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search */}
        <div className="p-2 sm:p-4 bg-white border-b flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold mr-2 sm:mr-4">Point of Sale</h1>
          <div className="relative flex-1 w-full sm:w-auto sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-2 sm:px-4 py-2 bg-gray-50 border-b">
          <Tabs
            defaultValue="All Items"
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <TabsList className="w-full flex overflow-x-auto hide-scrollbar" style={{ justifyContent: 'flex-start', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <TabsTrigger value="All Items" className="flex-shrink-0 text-xs sm:text-sm">All Items</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.name} className="flex-shrink-0 text-xs sm:text-sm">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Products grid - with proper scrolling */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2 sm:p-4 hide-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image={product.image_url || "https://placehold.co/300x200/e2e8f0/1e293b?text=No+Image"}
                  category={getCategoryName(product.category)}
                  onAddToCart={() => addToOrder(product)}
                  isInCart={isProductInCart(product.id)}
                  quantity={getProductQuantity(product.id)}
                  onIncreaseQuantity={() => updateQuantity(product.id, getProductQuantity(product.id) + 1)}
                  onDecreaseQuantity={() => updateQuantity(product.id, getProductQuantity(product.id) - 1)}
                  description={product.description}
                />
              ))}

              {filteredProducts.length === 0 && !isLoading && (
                <div className="col-span-full flex justify-center items-center h-64">
                  <p className="text-gray-500">No products found. Try a different search or category.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order summary sidebar */}
      <OrderSummary
        orderItems={orderItems}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        customerName={customerName}
        setCustomerName={setCustomerName}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        updateQuantity={updateQuantity}
        calculateTotal={calculateTotal}
        calculateTax={calculateTax}
        handlePayment={handlePayment}
        resetOrder={resetOrder}
        isSubmitting={isSubmitting}
        isOpen={summaryOpen}
        toggleSummary={toggleSummary}
      />

      {/* Receipt Dialog */}
      <ReceiptDialog
        showReceiptDialog={showReceiptDialog}
        setShowReceiptDialog={handleReceiptDialogClose}
        receiptData={receiptData}
        orderItems={orderItems}
        customerName={customerName}
        tableNumber={tableNumber}
        paymentMethod={paymentMethod}
        calculateTotal={calculateTotal}
        calculateTax={calculateTax}
        generateOrderNumber={generateOrderNumber}
        resetOrder={resetOrder}
      />
    </div>
  );
};


export default POS;
