
import React, { useState, useRef, useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CategoryManagement from "@/components/inventory/CategoryManagement";
import ProductManagement from "@/components/inventory/ProductManagement";

// Define the ref handler interface
interface ComponentRefHandle {
  refreshData: () => void;
}

// Wrapper components to fix ref forwarding
const ProductManagementWithRef = React.forwardRef((props, ref) => {
  return <ProductManagement {...props} ref={ref} />;
});

const CategoryManagementWithRef = React.forwardRef((props, ref) => {
  return <CategoryManagement {...props} ref={ref} />;
});

const Inventory = () => {
  const [productsExist, setProductsExist] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("products");
  const productsRef = useRef<ComponentRefHandle>(null);
  const categoriesRef = useRef<ComponentRefHandle>(null);
  
  // Load data when component mounts and check if products exist
  useEffect(() => {
    // Give time for refs to be established
    const timer = setTimeout(() => {
      // Load both products and categories data first
      if (productsRef.current) {
        productsRef.current.refreshData();
      }
      
      if (categoriesRef.current) {
        categoriesRef.current.refreshData();
      }
      
      // Add a small delay to check counts after data is loaded
      setTimeout(() => {
        const productsCount = productsRef.current && 'getProductsCount' in productsRef.current ? 
          (productsRef.current as any).getProductsCount() : 0;
        
        const categoriesCount = categoriesRef.current && 'getCategoriesCount' in categoriesRef.current ? 
          (categoriesRef.current as any).getCategoriesCount() : 0;
        
        // Logic for showing the right tab:
        // 1. If there are no categories, show the categories tab (user must create categories first)
        // 2. If there are categories but no products, show the categories tab (user should continue with products)
        // 3. If there are both categories and products, show the products tab (default view)
        
        const hasProducts = productsCount > 0;
        setProductsExist(hasProducts);
        
        if (!hasProducts || categoriesCount === 0) {
          // Guide user to categories tab if no products or no categories
          setActiveTab('categories');
        }
      }, 300);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle tab change with proper refresh
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Give the DOM a chance to update before triggering refresh
    setTimeout(() => {
      if (value === 'products' && productsRef.current) {
        // Only refresh if ref exists
        try {
          productsRef.current.refreshData();
        } catch (e) {
          console.error('Error refreshing products:', e);
        }
      } else if (value === 'categories' && categoriesRef.current) {
        // Only refresh if ref exists
        try {
          categoriesRef.current.refreshData();
        } catch (e) {
          console.error('Error refreshing categories:', e);
        }
      }
    }, 100);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-[calc(100vh-2rem)] p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your products and categories.</p>
          </div>
        </div>

        <Card className="border-none shadow-sm flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle>Inventory Control</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
              {/* Sticky tabs header */}
              <div className="sticky top-0 z-10 bg-background px-6 pt-2">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
                <TabsContent value="products" className="space-y-4 h-full">
                  <ErrorBoundary>
                    <ProductManagementWithRef ref={productsRef} />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="categories" className="space-y-4 h-full">
                  <ErrorBoundary>
                    <CategoryManagementWithRef ref={categoriesRef} />
                  </ErrorBoundary>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default Inventory;
