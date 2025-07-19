
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/SettingsContext';
import { defaultSettings } from '@/utils/settingsService';
import { useNavigate } from 'react-router-dom';
import useAppStore from '@/lib/zustand/appStateStore';

const Settings = () => {
  const navigate = useNavigate();
  const { userData } = useAppStore();
  const { settings, loading, updateSettings, updatePrimaryColor, resetToDefaults } = useSettings();
  const { toast } = useToast();
  
  const [taxRate, setTaxRate] = useState(settings.tax_rate.toString());
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [address, setAddress] = useState(settings.address);
  const [phoneNumber, setPhoneNumber] = useState(settings.phone_number);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  
  useEffect(() => {
    if (userData && userData.role !== 'admin' && userData.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "Only administrators and managers can access settings",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [userData, navigate, toast]);
  
  useEffect(() => {
    if (!loading) {
      setTaxRate(settings.tax_rate.toString());
      setBusinessName(settings.business_name);
      setAddress(settings.address);
      setPhoneNumber(settings.phone_number);
      setPrimaryColor(settings.primary_color);
    }
  }, [settings, loading]);
  
  const handleSaveChanges = async () => {
    try {
      const parsedTaxRate = parseFloat(taxRate);
      if (isNaN(parsedTaxRate)) {
        toast({
          title: "Invalid Tax Rate",
          description: "Please enter a valid number for tax rate.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Saving settings",
        description: "Updating your business information..."
      });
      
      const updates = {
        tax_rate: parsedTaxRate,
        business_name: businessName,
        address: address,
        phone_number: phoneNumber
      };
      
      const result = await updateSettings(updates);
      
      if (!result) {
        toast({
          title: "Update failed",
          description: "There was a problem updating your settings.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Settings saved",
        description: "Your business information has been updated successfully."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your settings.",
        variant: "destructive"
      });
    }
  };
  
  const saveThemeSettings = async () => {
    try {
      toast({
        title: "Updating theme",
        description: "Applying your color preferences..."
      });
      
      await updatePrimaryColor(primaryColor);
      
      toast({
        title: "Theme updated",
        description: "Your theme color has been applied and saved."
      });
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast({
        title: "Theme update failed",
        description: "There was a problem applying your theme settings.",
        variant: "destructive",
      });
    }
  };
  
  const handleResetDefaults = async () => {
    try {
      await resetToDefaults();
      setPrimaryColor(defaultSettings.primary_color);
      
      toast({
        title: "Theme reset",
        description: "Theme color has been reset to default value.",
      });
    } catch (error) {
      console.error('Error resetting theme:', error);
      toast({
        title: "Error",
        description: "Failed to reset theme color.",
        variant: "destructive"
      });
    }
  };
  
  if (userData && userData.role !== 'admin' && userData.role !== 'manager') {
    return <div>Access denied. Only administrators and managers can access settings.</div>;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6 h-[90vh] md:h-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Configure your POS system settings</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-auto h-[calc(100vh-200px)]">
        <Tabs defaultValue="general">
          <div className="border-b px-6 py-4">
            <TabsList>
              <TabsTrigger value="general" className="data-[state=active]:bg-gray-100">General</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="general" className="p-6">
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">General Settings</h2>
              <p className="text-sm text-gray-500 mb-6">foodie@hasbulla.com</p>
              
              <div className="space-y-8">
                <div className="grid grid-cols-3 items-center">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                    <p className="text-xs text-gray-500 mt-1">Applied to all orders by default</p>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="max-w-xs"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
{/*                 
                <div className="grid grid-cols-3 items-center">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Currency</label>
                    <p className="text-xs text-gray-500 mt-1">Currency symbol used throughout the app</p>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                </div>
                 */}
                {/* <div className="grid grid-cols-3 items-center">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Compact Interface</label>
                    <p className="text-xs text-gray-500 mt-1">Use a more compact interface for smaller screens</p>
                  </div>
                  <div className="col-span-2">
                    <Switch
                      checked={compactInterface}
                      onCheckedChange={setCompactInterface}
                    />
                  </div>
                </div> */}
                
                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Information</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 items-center">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Business Name</label>
                        <p className="text-xs text-gray-500 mt-1">Displayed on receipts and invoices</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 items-center">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <p className="text-xs text-gray-500 mt-1">Your business location</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 items-center">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone number</label>
                        <p className="text-xs text-gray-500 mt-1">Contact number for customers</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-8">
                <Button 
                  onClick={handleSaveChanges}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white hover:opacity-90"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="theme" className="p-6">
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Theme Settings</h2>
              <p className="text-sm text-gray-500 mb-6">Customize the application theme colors</p>
              
              <div className="space-y-8">
                <div className="grid grid-cols-3 items-center">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Primary Color</label>
                    <p className="text-xs text-gray-500 mt-1">Main color used throughout the app</p>
                  </div>
                  <div className="col-span-2 flex items-center space-x-4">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 items-center">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preview</label>
                    <p className="text-xs text-gray-500 mt-1">See how your colors look</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex gap-4">
                      <Button 
                        style={{ backgroundColor: primaryColor }}
                        className="text-white"
                      >
                        Primary Button
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-8 space-x-4">
                <Button 
                  variant="outline"
                  onClick={handleResetDefaults}
                  className="border border-gray-300 hover:bg-gray-100"
                >
                  Reset to Defaults
                </Button>
                <Button 
                  onClick={saveThemeSettings}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white hover:opacity-90"
                >
                  Save Theme
                </Button>
              </div>
            </div>
          </TabsContent>
          

        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
