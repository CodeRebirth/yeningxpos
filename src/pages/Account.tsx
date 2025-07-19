import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import useAppStore from '@/lib/zustand/appStateStore';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadImage } from '@/utils/imageUpload';

const Account = () => {
  const { toast } = useToast();
  const { session, signOut } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [editName, setEditName] = useState({ first_name: '', last_name: '' });
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { userData } = useAppStore();

  if (!userData) {
    return null;
  }

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a URL for the selected image
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setIsCropDialogOpen(true);
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: Crop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        1
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imageRef.current || !selectedImage) return;

    try {
      setIsUploadingImage(true);
      const croppedImageBlob = await getCroppedImg(imageRef.current, crop);
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' });

      // const fileName = `category_${Date.now()}`;
      //       const imageUrl = await uploadImage(imageFile, 'inventory', 'categories', fileName);
      
      const imageUrl = await uploadImage(
        file,
        'user_content',
        'profile_images',
        `profile_${ userData.userId}`
      );

      if (!imageUrl) {
        throw new Error('Failed to get image URL');
      }

      // Update the profile URL in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_url: imageUrl })
        .eq('id', userData.userId);

      if (updateError) throw updateError;

      // Update local state
      setProfileUrl(imageUrl);
      setIsCropDialogOpen(false);
      setSelectedImage(null);

      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile image:', error);
      let errorMessage = 'Failed to update profile image';

      if (error instanceof Error) {
        errorMessage = error.message.includes('Permission denied')
          ? 'Permission denied: Unable to upload image.'
          : `Error: ${error.message}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleOpenEditName = () => {
    setEditName({
      first_name: userData.first_name,
      last_name: userData.last_name
    });
    setIsEditNameOpen(true);
  };

  const handleOpenEditEmail = () => {
    setEditEmail(userData.email);
    setIsEditEmailOpen(true);
  };

  const handleUpdateName = async () => {
    if (!userData || !editName.first_name || !editName.last_name) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editName.first_name,
          last_name: editName.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.userId);

      if (error) throw error;

      // Update Zustand store instead of local state
      useAppStore.setState({
        userData: {
          ...userData,
          first_name: editName.first_name,
          last_name: editName.last_name
        }
      });

      setIsEditNameOpen(false);
      toast({
        title: "Success",
        description: "Name updated successfully",
      });
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: "Error",
        description: "Failed to update name",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!userData || !editEmail || !currentPassword) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: editEmail
      });

      if (error) throw error;

      // Update Zustand store
      useAppStore.setState({
        userData: {
          ...userData,
          email: editEmail
        }
      });

      setIsEditEmailOpen(false);
      setCurrentPassword('');
      toast({
        title: "Email update initiated",
        description: "Please check your new email address for a confirmation link",
      });
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto h-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Account</h1>
        <p className="text-sm sm:text-base text-gray-500">Manage your account details and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8 max-h-[80vh] overflow-y-auto">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Personal Information</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">View and manage your account details</p>

        <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0 sm:mr-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center relative mx-auto sm:mx-0">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-24 mx-auto sm:mx-0"
              onClick={handleTriggerFileInput}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? 'Uploading...' : 'Change'}
            </Button>
          </div>

          <div className="flex-1 space-y-4 sm:space-y-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <div className="flex items-center">
                  <span className="block text-gray-800 font-medium">
                    {userData.first_name} {userData.last_name}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2 text-viilare-500 p-0"
                    onClick={handleOpenEditName}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex items-center">
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-viilare-100 text-viilare-800 rounded-full">
                    {userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center">
                <span className="block text-gray-800">{userData.email}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 text-viilare-500 p-0"
                  onClick={handleOpenEditEmail}
                >
                  Change
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Permissions</h3>
          <ul className="space-y-3 sm:space-y-4">
            {userData.role === 'admin' ? (
              // Admin permissions
              <>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Full access to all functionality</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">User management</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Menu management</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Reports and analytics</p>
                  </div>
                </li>
              </>
            ) : (
              // Staff permissions
              <>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Limited access to system functionality</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Process sales and orders</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-viilare-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">View inventory status</p>
                  </div>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex justify-center sm:justify-end mt-6 sm:mt-8 pb-4">
          <Button
            onClick={handleSignOut}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Out...
              </>
            ) : 'Sign Out'}
          </Button>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Your Name</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="firstName" className="sm:text-right">
                First Name
              </Label>
              <Input
                id="firstName"
                value={editName.first_name}
                onChange={(e) => setEditName({ ...editName, first_name: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="lastName" className="sm:text-right">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={editName.last_name}
                onChange={(e) => setEditName({ ...editName, last_name: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditNameOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              disabled={isLoading || !editName.first_name || !editName.last_name}
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={isEditEmailOpen} onOpenChange={setIsEditEmailOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Your Email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="newEmail" className="sm:text-right">
                New Email
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="password" className="sm:text-right">
                Current Password
              </Label>
              <Input
                id="password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="col-span-1 sm:col-span-4 text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0">
              You will receive a confirmation email to verify your new address
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditEmailOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEmail}
              disabled={isLoading || !editEmail || !currentPassword}
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop Profile Image</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedImage && (
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                aspect={1} // This is a prop of ReactCrop, not part of the crop state
                circularCrop
              >
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Crop me"
                  style={{ maxWidth: '100%' }}
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCropDialogOpen(false);
                setSelectedImage(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={isUploadingImage || !selectedImage}
            >
              {isUploadingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Account;
