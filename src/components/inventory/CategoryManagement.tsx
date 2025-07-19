
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { Category } from '@/types/inventory';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/utils/imageUpload';
import useAppStore from '@/lib/zustand/appStateStore';

const CategoryManagement = forwardRef((props, ref) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const { session } = useAuthContext();
  const {userData} = useAppStore();
  
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    image_url: ''
  });
  
  const [editing, setEditing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Fetch categories from Supabase filtered by business_id
  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Get business_id based on user role
      const business_id = userData?.business_id;
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business_id);
      
      if (error) throw error;
      
      if (data) {
        setCategories(data as Category[]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refreshData: fetchCategories,
    // Add method to get categories count
    getCategoriesCount: () => categories.length
  }));
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const fileName = `category_${Date.now()}`;
      const imageUrl = await uploadImage(imageFile, 'inventory', 'categories', fileName);
      
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
      description: '', 
      image_url: '' 
    });
    setEditing(null);
    setImagePreview('');
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Check if category name already exists for this business
  const checkCategoryExists = async (name: string, excludeId?: string): Promise<boolean> => {
    try {
      // Get business_id based on user role
      const business_id = userData?.business_id;
      
      let query = supabase
        .from('categories')
        .select('id')
        .eq('business_id', business_id)
        .ilike('name', name.trim());
      
      // If we're updating, exclude the current category
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking if category exists:', error);
      return false;
    }
  };
  
  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }
    
    // Prevent duplicate submissions
    if (loading || uploadingImage) {
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
        // Check if updated name conflicts with existing category
        const categoryExists = await checkCategoryExists(formData.name, editing);
        if (categoryExists) {
          toast.error(`A category with the name "${formData.name}" already exists`);
          setLoading(false);
          return;
        }
        
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description,
            image_url: imageUrl
          })
          .eq('id', editing);
        
        if (error) throw error;
        
        // Update local state
        setCategories(categories.map(cat => 
          cat.id === editing 
            ? { ...cat, ...formData, image_url: imageUrl } as Category
            : cat
        ));
        toast.success('Category updated successfully');
      } else {
        // Get business_id based on user role
        const business_id = userData?.business_id;
        
        // Check if category with this name already exists
        const categoryExists = await checkCategoryExists(formData.name);
        if (categoryExists) {
          toast.error(`A category with the name "${formData.name}" already exists`);
          setLoading(false);
          return;
        }
        
        // Insert new category
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: formData.name.trim(),
            description: formData.description,
            image_url: imageUrl || 'https://placehold.co/600x600',
            business_id: business_id
          })
          .select();
        
        if (error) throw error;
        
        // Update local state
        if (data && data.length > 0) {
          setCategories([...categories, data[0] as Category]);
        }
        
        toast.success('Category added successfully');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      // Ensure loading state is always cleared
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  
  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description,
      image_url: category.image_url
    });
    setEditing(category.id);
    setImagePreview(category.image_url || '');
  };
  
  // Open delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };
  // Execute category deletion
  const executeDelete = async () => {
    if (!categoryToDelete) return;
    
    // Check if user has permission to delete categories
    if (userData?.role === 'staff') {
      toast.error('Staff members do not have permission to delete categories');
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      return;
    }
    
    try {
      setDeleteLoading(true);
      
      // Delete from Supabase
      const business_id = userData?.business_id;
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete)
        .eq('business_id', business_id);
      
      if (error) throw error;
      
      // Update local state
      setCategories(categories.filter(category => category.id !== categoryToDelete));
      toast.success('Category deleted successfully');
      
      if (editing === categoryToDelete) {
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-5 lg:col-span-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter category name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              placeholder="Enter category description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Category Image</Label>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted">
                {imagePreview ? (
                  <img 
                    src={imagePreview}
                    alt="Category preview"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Image will be optimized to 600x600px WebP format
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1 text-white"
              disabled={loading || uploadingImage}
            >
              {(loading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadingImage ? 'Uploading Image...' : 
               loading ? 'Saving...' : 
               editing ? 'Update Category' : 'Add Category'}
            </Button>
            {editing && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
                disabled={loading || uploadingImage}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
      
      <div className="md:col-span-7 lg:col-span-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square w-full bg-muted flex items-center justify-center">
                  <img 
                    src={category.image_url} 
                    alt={category.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{category.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      onClick={() => openDeleteDialog(category.id)}
                      disabled={userData?.role === 'staff'}
                      title={userData?.role === 'staff' ? 'Staff members cannot delete categories' : 'Delete category'}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={executeDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
});

export default CategoryManagement;
