import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Search, Printer, Download, X, ChevronLeft, ChevronRight, Calendar, FileDown, Save, Edit, Check, Trash2, Plus, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import useAppStore from '@/lib/zustand/appStateStore';

// Define types
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  profile_url?: string;
}

interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  price: string;
  product_id?: string;
  unit_price?: number;
  total_price?: number;
  isEditing?: boolean;
  isNew?: boolean;
}

interface Receipt {
  id: string;
  date: string;
  time?: string;
  customer: string;
  customer_id?: string;
  amount: string;
  status: string;
  items?: ReceiptItem[];
  subtotal?: string;
  tax?: string;
  total?: string;
  paymentMethod?: string;
  created_by?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  in_stock?: boolean;
}

const Receipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [originalItems, setOriginalItems] = useState<ReceiptItem[]>([]);
  const itemsPerPage = 8;
  const receiptRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const { settings } = useSettings();
  const { userData } = useAppStore();

  // Fetch receipts and users from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get the business ID
        let businessId = userData?.business_id; 
        
        if (!businessId) {
          throw new Error('User ID not available. Please log in again.');
        }
        
        // console.log('Fetching receipts for business ID:', businessId);
        
        // Fetch users
        const { data: usersData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role, created_at, updated_at')
          .eq('business_id', businessId);

        if (userError) throw userError;
        if (usersData) setUsers(usersData as unknown as User[]);

        // Fetch receipts filtered by business_id
        const { data: receiptData, error: receiptError } = await supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (receiptError) throw receiptError;

        if (receiptData) {
          // Transform receipt data
          const formattedReceipts = await Promise.all(
            receiptData.map(async (order) => {
              // Fetch order items for each order, filtered by business_id
              const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id)
                .eq('business_id', businessId);

              // Format the receipt with items
              return {
                id: `#${order.order_no.toString().padStart(6, '0').slice(-6)}`,
                date: new Date(order.created_at).toISOString().split('T')[0],
                time: new Date(order.created_at).toTimeString().substring(0, 5),
                customer: order.customer_name || 'Unknown Customer',
                customer_id: order.user_id,
                amount: `₹${order.total_amount?.toFixed(2) || '0.00'}`,
                status: order.order_status || 'Completed',
                created_by: order.user_id,
                items: items?.map(item => ({
                  id: item.id,
                  product_id: item.product_id,
                  name: item.product_name || 'Unknown Item',
                  quantity: item.quantity || 1,
                  unit_price: item.unit_price || 0,
                  total_price: item.total_price || 0,
                  price: `₹${item.total_price?.toFixed(2) || '0.00'}`,
                  isEditing: false
                })),
                subtotal: `₹${order.subtotal?.toFixed(2) || order.total_amount?.toFixed(2) || '0.00'}`,
                tax: `₹${order.tax_amount?.toFixed(2) || '0.00'}`,
                total: `₹${order.total_amount?.toFixed(2) || '0.00'}`,
                paymentMethod: order.payment_method || 'Cash'
              };
            })
          );

          setReceipts(formattedReceipts);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load receipts data',
          variant: 'destructive'
        });

        // Fallback to sample data if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    fetchProducts(); // Fetch products for item selection
  }, []);

  // Fetch products from the database
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      // Get the business ID
      let businessId = userData?.business_id;
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, category, image_url')
        .eq('in_stock', true)
        .eq('business_id', businessId);
      
      if (error) throw error;
      
      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Filter products based on search term
  useEffect(() => {
    if (productSearchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(productSearchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchTerm, products]);

  // Filter receipts based on time filter and search term
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchTerm === '' ||
      receipt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.amount.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const receiptDate = new Date(receipt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    switch (timeFilter) {
      case 'today':
        return receiptDate.toDateString() === today.toDateString();
      case 'week':
        return receiptDate >= weekAgo;
      case 'month':
        return receiptDate >= monthAgo;
      default:
        return true;
    }
  });

  // Pagination
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setTotalPages(Math.ceil(filteredReceipts.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [filteredReceipts.length, itemsPerPage]);

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    // Store original items for potential reset
    if (receipt.items) {
      setOriginalItems([...receipt.items]);
    }
    setEditMode(false);
    setIsReceiptModalOpen(true);
  };
  
  // Toggle edit mode for all items
  const toggleEditMode = () => {
    setEditMode(!editMode);
    
    if (selectedReceipt && selectedReceipt.items) {
      const updatedItems = selectedReceipt.items.map(item => ({
        ...item,
        isEditing: !editMode
      }));
      
      setSelectedReceipt({
        ...selectedReceipt,
        items: updatedItems
      });
    }
  };
  
  // Add a new item to the receipt
  const addNewItem = () => {
    if (!selectedReceipt) return;
    
    // Open product selector instead of adding empty item
    setIsProductSelectorOpen(true);
  };
  
  // Add selected product to receipt
  const addProductToReceipt = (product: Product) => {
    if (!selectedReceipt) return;
    
    // Create a new item from the selected product
    const newItem: ReceiptItem = {
      name: product.name,
      quantity: 1,
      product_id: product.id,
      unit_price: product.price,
      total_price: product.price,
      price: `₹${product.price.toFixed(2)}`,
      isEditing: true,
      isNew: true // Flag to identify newly added items
    };
    
    // Add the new item to the receipt
    const updatedItems = selectedReceipt.items ? [...selectedReceipt.items, newItem] : [newItem];
    
    // Recalculate totals
    const newSubtotal = updatedItems.reduce((sum, item) => {
      const itemPrice = item.total_price || parseFloat(item.price.replace('₹', ''));
      return sum + itemPrice;
    }, 0);
    
    // Assume tax rate from settings or default to 5%
    const taxRate = (settings?.tax_rate || 5) / 100;
    const newTax = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTax;
    
    setSelectedReceipt({
      ...selectedReceipt,
      items: updatedItems,
      subtotal: `₹${newSubtotal.toFixed(2)}`,
      tax: `₹${newTax.toFixed(2)}`,
      total: `₹${newTotal.toFixed(2)}`,
      amount: `₹${newTotal.toFixed(2)}`
    });
    
    // Close the product selector
    setIsProductSelectorOpen(false);
    setProductSearchTerm('');
  };
  
  // Delete an item from the receipt
  const deleteItem = async (index: number) => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    
    const itemToDelete = selectedReceipt.items[index];
    const updatedItems = [...selectedReceipt.items];
    updatedItems.splice(index, 1);
    
    // Recalculate totals
    const newSubtotal = updatedItems.reduce((sum, item) => {
      const itemPrice = item.total_price || parseFloat(item.price.replace('₹', ''));
      return sum + itemPrice;
    }, 0);
    
    // Assume tax rate from settings or default to 5%
    const taxRate = (settings?.tax_rate || 5) / 100;
    const newTax = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTax;
    
    setSelectedReceipt({
      ...selectedReceipt,
      items: updatedItems,
      subtotal: `₹${newSubtotal.toFixed(2)}`,
      tax: `₹${newTax.toFixed(2)}`,
      total: `₹${newTotal.toFixed(2)}`,
      amount: `₹${newTotal.toFixed(2)}`
    });
  };
  
  // Handle item quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    
    const updatedItems = [...selectedReceipt.items];
    const item = updatedItems[index];
    
    // Ensure quantity is at least 1
    newQuantity = Math.max(1, newQuantity);
    
    // Calculate new price based on unit price
    const unitPrice = item.unit_price || parseFloat(item.price.replace('₹', '')) / item.quantity;
    const newTotalPrice = unitPrice * newQuantity;
    
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total_price: newTotalPrice,
      price: `₹${newTotalPrice.toFixed(2)}`
    };
    
    // Recalculate subtotal, tax, and total
    const newSubtotal = updatedItems.reduce((sum, item) => {
      const itemPrice = item.total_price || parseFloat(item.price.replace('₹', ''));
      return sum + itemPrice;
    }, 0);
    
    // Assume tax rate from settings or default to 5%
    const taxRate = (settings?.tax_rate || 5) / 100;
    const newTax = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTax;
    
    setSelectedReceipt({
      ...selectedReceipt,
      items: updatedItems,
      subtotal: `₹${newSubtotal.toFixed(2)}`,
      tax: `₹${newTax.toFixed(2)}`,
      total: `₹${newTotal.toFixed(2)}`,
      amount: `₹${newTotal.toFixed(2)}`
    });
  };
  
  // Handle item name change
  const handleNameChange = (index: number, newName: string) => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    
    const updatedItems = [...selectedReceipt.items];
    updatedItems[index] = {
      ...updatedItems[index],
      name: newName
    };
    
    setSelectedReceipt({
      ...selectedReceipt,
      items: updatedItems
    });
  };
  
  // Save changes to database
  const saveChanges = async () => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    
    setIsSaving(true);
    
    try {
      // Get the business ID
      let businessId = userData?.business_id;
      
      // Update order total in orders table
      await supabase
        .from('orders')
        .update({
          total_amount: parseFloat(selectedReceipt.total.replace('₹', '')),
          subtotal: parseFloat(selectedReceipt.subtotal.replace('₹', '')),
          tax_amount: parseFloat(selectedReceipt.tax.replace('₹', '')),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReceipt.id)
        .eq('business_id', businessId);
      
      // Track items to delete
      const originalItemIds = originalItems
        .filter(item => item.id)
        .map(item => item.id);
      
      const currentItemIds = selectedReceipt.items
        .filter(item => item.id)
        .map(item => item.id);
      
      // Find items that were deleted (in original but not in current)
      const deletedItemIds = originalItemIds.filter(id => !currentItemIds.includes(id));
      
      // Delete removed items from database
      if (deletedItemIds.length > 0) {
        for (const id of deletedItemIds) {
          await supabase
            .from('order_items')
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);
        }
      }
      
      // Update existing items and add new ones
      for (const item of selectedReceipt.items) {
        const itemPrice = item.total_price || parseFloat(item.price.replace('₹', ''));
        
        if (item.id) {
          // Update existing item
          await supabase
            .from('order_items')
            .update({
              product_name: item.name,
              quantity: item.quantity,
              total_price: itemPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('business_id', businessId);
        } else {
          // Insert new item
          await supabase
            .from('order_items')
            .insert({
              order_id: selectedReceipt.id,
              business_id: businessId,
              product_name: item.name,
              product_id: item.product_id || null,
              quantity: item.quantity,
              unit_price: item.unit_price || (itemPrice / item.quantity),
              total_price: itemPrice,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }
      
      // Update the receipts list with the updated receipt
      const updatedReceipts = receipts.map(receipt => 
        receipt.id === selectedReceipt.id ? selectedReceipt : receipt
      );
      
      setReceipts(updatedReceipts);
      setEditMode(false);
      
      // Update the items to not be in edit mode
      const updatedItems = selectedReceipt.items.map(item => ({
        ...item,
        isEditing: false
      }));
      
      setSelectedReceipt({
        ...selectedReceipt,
        items: updatedItems
      });
      
      // Store the updated items as the new original items
      setOriginalItems([...updatedItems]);
      
      toast({
        title: 'Success',
        description: 'Receipt updated successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast({
        title: 'Error',
        description: 'Failed to update receipt',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel editing and revert to original values
  const cancelEditing = () => {
    if (selectedReceipt) {
      setSelectedReceipt({
        ...selectedReceipt,
        items: [...originalItems],
        subtotal: selectedReceipt.subtotal,
        tax: selectedReceipt.tax,
        total: selectedReceipt.total,
        amount: selectedReceipt.amount
      });
    }
    
    setEditMode(false);
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && selectedReceipt) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${selectedReceipt.id}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 20px;
                max-width: 300px;
                margin: 0 auto;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 10px;
              }
              .receipt-header h2 {
                font-size: 16px;
                margin: 0;
              }
              .receipt-header p {
                margin: 5px 0;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .item-name {
                flex: 1;
              }
              .item-qty {
                width: 30px;
                text-align: center;
              }
              .item-price {
                width: 80px;
                text-align: right;
              }
              .total-section {
                margin-top: 10px;
                text-align: right;
              }
              .receipt-footer {
                text-align: center;
                margin-top: 20px;
                font-size: 10px;
              }
              @media print {
                body {
                  width: 80mm;
                }
                @page {
                  margin: 0;
                  size: 80mm 297mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-header">
              <h2>VIILARE RESTAURANT</h2>
              <p>123 Main Street, City</p>
              <p>Tel: +91 1234567890</p>
              <p>GST No: 22AAAAA0000A1Z5</p>
            </div>
            
            <div class="divider"></div>
            
            <p>Receipt: ${selectedReceipt.id}</p>
            <p>Date: ${selectedReceipt.date} ${selectedReceipt.time || ''}</p>
            <p>Customer: ${selectedReceipt.customer}</p>
            <p>Payment: ${selectedReceipt.paymentMethod || 'Cash'}</p>
            
            <div class="divider"></div>
            
            <div class="items-section">
              <div class="item-row" style="font-weight: bold;">
                <div class="item-name">Item</div>
                <div class="item-qty">Qty</div>
                <div class="item-price">Price</div>
              </div>
              ${selectedReceipt.items ?
          selectedReceipt.items.map(item => `
                  <div class="item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-qty">${item.quantity}</div>
                    <div class="item-price">${item.price}</div>
                  </div>
                `).join('') :
          `<div class="item-row">
                  <div class="item-name">Food and Beverages</div>
                  <div class="item-qty">1</div>
                  <div class="item-price">${selectedReceipt.amount}</div>
                </div>`
        }
            </div>
            
            <div class="divider"></div>
            
            <div class="total-section">
              <p>Subtotal: ${selectedReceipt.subtotal || selectedReceipt.amount}</p>
              <p>Tax: ${selectedReceipt.tax || '₹0.00'}</p>
              <p style="font-weight: bold;">Total: ${selectedReceipt.total || selectedReceipt.amount}</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="receipt-footer">
              <p>Thank you for dining with us!</p>
              <p>Visit us again soon.</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleSaveAsPDF = () => {
    // This triggers the print dialog which can save as PDF
    handlePrintReceipt();
  };

  const handleDownloadReport = async () => {
    try {
      // Create CSV content
      let csvContent = "Receipt ID,Date,Customer,Amount,Status,Payment Method\n";

      filteredReceipts.forEach(receipt => {
        csvContent += `${receipt.id},${receipt.date},${receipt.customer},${receipt.amount},${receipt.status},${receipt.paymentMethod || 'Cash'}\n`;
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `receipts_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive'
      });
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Unknown';
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown';
    return `${user.first_name} ${user.last_name}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6 h-[90vh] md:h-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Receipts</h1>
        <p className="text-gray-500">View and manage all transaction receipts</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 w-full">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                variant={timeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTimeFilter('all')}
                className={timeFilter === 'all' ? 'bg-viilare-500 hover:bg-viilare-600 text-white' : ''}
              >
                All
              </Button>
              <Button
                variant={timeFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setTimeFilter('today')}
                className={timeFilter === 'today' ? 'bg-viilare-500 hover:bg-viilare-600 text-white' : ''}
              >
                Today
              </Button>
              <Button
                variant={timeFilter === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeFilter('week')}
                className={timeFilter === 'week' ? 'bg-viilare-500 hover:bg-viilare-600 text-white' : ''}
              >
                This Week
              </Button>
              <Button
                variant={timeFilter === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeFilter('month')}
                className={timeFilter === 'month' ? 'bg-viilare-500 hover:bg-viilare-600 text-white' : ''}
              >
                This Month
              </Button>
            </div>
          
            {/* Search and Download */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search receipts..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                className="bg-viilare-500 hover:bg-viilare-600 flex items-center gap-2 w-full sm:w-auto text-white"
                onClick={handleDownloadReport}
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden md:inline text-white">Download Report</span>
                <span className="md:hidden text-white">Download</span>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[40vh] md:max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedReceipts.length > 0 ? (
                    paginatedReceipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{receipt.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{receipt.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{receipt.customer}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{receipt.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${receipt.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            receipt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                            {receipt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getUserName(receipt.created_by)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">

                          <Button
                            size="sm"
                            className="bg-viilare-500 hover:bg-viilare-600 text-white"
                            onClick={() => handleViewReceipt(receipt)}
                          >
                            View
                          </Button>

                          <Button size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              handlePrintReceipt();
                            }}
                            className="bg-viilare-500 hover:bg-viilare-600 text-white"
                          >
                            Print
                          </Button>

                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                        No receipts found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {filteredReceipts.length > 0 ? (
                    <>
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredReceipts.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredReceipts.length}</span> results
                    </>
                  ) : (
                    "No results"
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipt Preview Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-md p-0 bg-white">
          <DialogHeader className="p-4 border-b flex justify-between items-center">
            <DialogTitle>Receipt {selectedReceipt?.id}</DialogTitle>
            <div className="flex space-x-2">
              <Button
                size="sm"
                className="bg-viilare-500 hover:bg-viilare-600"
                onClick={handlePrintReceipt}
              >

                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                size="sm"
                className="bg-viilare-500 hover:bg-viilare-600"
                onClick={handleSaveAsPDF}
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <div className="flex space-x-2">
                {!editMode ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={toggleEditMode}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit Items</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={saveChanges}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Save Changes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancel Editing</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                
                <DialogClose asChild>
                  <Button
                    size="sm"
                    className="text-gray-500 p-1 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {/* Receipt Content */}
          <div className="p-6 font-mono text-sm bg-white max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-4">
              <h2 className="font-bold text-lg">{settings?.business_name || 'VIILARE RESTAURANT'}</h2>
              <p>{settings?.address || '123 Main Street, City'}</p>
              <p>Tel: {settings?.phone_number || '+91 1234567890'}</p>
              <p>GST No: {settings?.tax_rate ? `22AAAAA${settings.tax_rate}Z5` : '22AAAAA0000A1Z5'}</p>
            </div>

            <div className="border-t border-dashed my-4 border-gray-300"></div>

            <div>
              <p><span className="font-semibold">Receipt:</span> {selectedReceipt?.id}</p>
              <p><span className="font-semibold">Date:</span> {selectedReceipt?.date} {selectedReceipt?.time || ''}</p>
              <p><span className="font-semibold">Customer:</span> {selectedReceipt?.customer}</p>
              <p><span className="font-semibold">Payment:</span> {selectedReceipt?.paymentMethod || 'Cash'}</p>
              <p><span className="font-semibold">Created by:</span> {selectedReceipt?.created_by ? getUserName(selectedReceipt.created_by) : 'Unknown'}</p>
            </div>

            <div className="border-t border-dashed my-4 border-gray-300"></div>

            <div>
              <div className="flex justify-between font-semibold">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/3 text-right">Price</span>
                {editMode && <span className="w-10"></span>}
              </div>

              <div className="border-t border-gray-200 my-2"></div>

              {selectedReceipt?.items ? (
                selectedReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 items-center">
                    {editMode ? (
                      <>
                        <Input
                          className="w-1/2 h-8 text-sm"
                          value={item.name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                        />
                        <div className="w-1/6 flex justify-center items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <Input
                            className="w-10 h-8 text-sm text-center"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <span className="w-1/3 text-right">{item.price}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="w-1/2">{item.name}</span>
                        <span className="w-1/6 text-center">{item.quantity}</span>
                        <span className="w-1/3 text-right">{item.price}</span>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex justify-between py-1">
                  <span className="w-1/2">Food and Beverages</span>
                  <span className="w-1/6 text-center">1</span>
                  <span className="w-1/3 text-right">{selectedReceipt?.amount}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed my-4 border-gray-300"></div>

            {editMode && (
              <div className="mt-4 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 border-dashed"
                  onClick={addNewItem}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-xs">Add Product</span>
                </Button>
                
                {/* Product Selector Dialog */}
                <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Select Product</DialogTitle>
                    </DialogHeader>
                    
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-8"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <ScrollArea className="h-72">
                      {isLoadingProducts ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-viilare-500"></div>
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No products found
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 p-2">
                          {filteredProducts.map((product) => (
                            <div 
                              key={product.id} 
                              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => addProductToReceipt(product)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500 truncate">
                                  {product.description || 'No description'}
                                </div>
                              </div>
                              <div className="font-semibold">₹{product.price.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsProductSelectorOpen(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            <div className="text-right">
              <p><span className="font-semibold">Subtotal:</span> {selectedReceipt?.subtotal || selectedReceipt?.amount}</p>
              <p><span className="font-semibold">Tax:</span> {selectedReceipt?.tax || '₹0.00'}</p>
              <p className="font-bold"><span>Total:</span> {selectedReceipt?.total || selectedReceipt?.amount}</p>
            </div>

            <div className="border-t border-dashed my-4 border-gray-300"></div>

            <div className="text-center text-xs">
              <p>Thank you for dining with us!</p>
              <p>Visit us again soon.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receipts;
