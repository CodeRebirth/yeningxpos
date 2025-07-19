import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, Package, Upload, Loader2 } from 'lucide-react';
import { Product, Category } from '@/types/inventory';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/utils/imageUpload';
import useAppStore from '@/lib/zustand/appStateStore';

const ProductManagement = forwardRef((props, ref) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const { session } = useAuthContext();
  const {userData}= useAppStore();

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: undefined,
    description: '',
    category: '',
    image_url: '',
    stock_quantity: undefined,
    sku: '',
    cost_price: undefined
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  /**
   * Fetch products and categories from Supabase filtered by business_id
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get business_id based on user role
      const business_id = userData?.business_id;
      
      // Fetch categories filtered by business_id
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business_id);

      if (categoriesError) throw categoriesError;

      if (categoriesData) {
        setCategories(categoriesData as Category[]);
      }

      // Fetch products filtered by business_id
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business_id);

      if (productsError) throw productsError;

      if (productsData) {
        setProducts(productsData as Product[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refreshData: fetchData,
    // Add method to get products count
    getProductsCount: () => products.length
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'price' || name === 'cost_price' || name === 'stock_quantity'
      ? parseFloat(value) || 0
      : value;

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image file size must be less than 2MB');
      return;
    }
    
    if (!supportedFormats.includes(file.type)) {
      toast.error('Unsupported image format. Please use JPEG, PNG, WebP, GIF, or SVG');
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setImageFile(file);
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const fileName = `product_${Date.now()}`;
      const imageUrl = await uploadImage(imageFile, 'inventory', 'products', fileName);

      if (!imageUrl) {
        // If upload failed, show a specific error message
        toast.error(
          'Unable to upload image due to permission restrictions. Please use image URL instead.',
          { duration: 5000 }
        );
      }

      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);

      // More specific error message
      if (error instanceof Error && error.message.includes('Permission denied')) {
        toast.error(
          'Permission denied: Unable to upload to Supabase. Please use image URL instead.',
          { duration: 5000 }
        );
      } else {
        toast.error('Failed to upload image');
      }

      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: undefined,
      description: '',
      category: '',
      image_url: '',
      stock_quantity: undefined,
      sku: '',
      cost_price: undefined
    });
    setEditing(null);
    setImagePreview('');
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity,
      description: product.description,
      category: product.category,
      image_url: product.image_url,
      sku: product.sku,
      cost_price: product.cost_price
    });
    setEditing(product.id);
    setImagePreview(product.image_url);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || formData.price === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Upload image if a new one was selected
      let imageUrl = formData.image_url;
      if (imageFile) {
        imageUrl = await handleImageUpload();
        if (!imageUrl) {
          toast.error('Failed to upload image');
          setLoading(false);
          return;
        }
      }

      if (editing) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            price: formData.price,
            description: formData.description || '',
            category: formData.category,
            image_url: imageUrl,
            stock_quantity: formData.stock_quantity || 0,
            sku: formData.sku,
            cost_price: formData.cost_price
          })
          .eq('id', editing);

        if (error) throw error;

        // Update local state
        setProducts(products.map(product =>
          product.id === editing
            ? { ...product, ...formData, image_url: imageUrl } as Product
            : product
        ));
        toast.success('Product updated successfully');
      } else {
        // Generate SKU if not provided
        const sku = formData.sku || `SKU${Date.now().toString().slice(-6)}`;

        // Get business_id based on user role
        const business_id = userData?.business_id;
        
        // Insert new product
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            price: formData.price,
            description: formData.description || '',
            category: formData.category,
            image_url: imageUrl,
            stock_quantity: formData.stock_quantity || 0,
            sku: sku,
            cost_price: formData.cost_price,
            business_id: business_id
          })
          .select();

        if (error) throw error;

        // Update local state
        if (data && data.length > 0) {
          setProducts([...products, data[0] as Product]);
        }

        toast.success('Product added successfully');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
      setDialogOpen(false);
      resetForm();
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Execute product deletion
  const executeDelete = async () => {
    if (!productToDelete) return;
    
    // Check if user has permission to delete products
    if (userData?.role === 'staff') {
      toast.error('Staff members do not have permission to delete products');
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      return;
    }
    
    try {
      setDeleteLoading(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      // Update local state
      setProducts(products.filter(product => product.id !== productToDelete));
      toast.success('Product deleted successfully');

      if (editing === productToDelete) {
        resetForm();
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = search === '' ||
      (product.name?.toLowerCase().includes(search.toLowerCase())) ||
      (product.sku?.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products by name or SKU..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className='bg-viilare-500 hover:bg-viilare-600 text-white' onClick={openAddDialog}>
            <Plus
              className="mr-1 h-4 w-4 " /> Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 overflow-hidden rounded-md">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{getCategoryName(product.category)}</TableCell>
                    <TableCell className="text-right">₹{product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{product.stock_quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(product.id)}
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                          disabled={userData?.role === 'staff'}
                          title={userData?.role === 'staff' ? 'Staff members cannot delete products' : 'Delete product'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8 mb-2" />
                      <p>No products found</p>
                      {search && (
                        <p className="text-sm">Try adjusting your search or filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name*</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku || ''}
                  onChange={handleInputChange}
                  placeholder="Enter SKU"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category*</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock_quantity ?? ''}
                  onChange={handleInputChange}
                  placeholder="Enter stock quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Selling Price (₹)*</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price ?? ''}
                  onChange={handleInputChange}
                  placeholder="Enter price"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price (₹)</Label>
                <Input
                  id="cost_price"
                  name="cost_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_price ?? ''}
                  onChange={handleInputChange}
                  placeholder="Enter cost price (optional)"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="image">Product Image</Label>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full">
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Image will be optimized to 600x600px WebP format
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full text-white"
                disabled={loading || uploadingImage}
              >
                {(loading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingImage ? 'Uploading Image...' : loading ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={executeDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
});

export default ProductManagement;
