import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  SettingsData,
  defaultSettings,
  getCurrentUser,
  getSettings,
  createDefaultSettings,
  updateSettings as updateSettingsInDB,
  applyThemeColors,
  getUserProfile
} from '@/utils/settingsService';
import { useAuthContext } from './AuthContext';
import useAppStore from '@/lib/zustand/appStateStore';

type SettingsContextType = {
  settings: SettingsData;
  loading: boolean;
  updateSettings: (updates: Partial<SettingsData>) => Promise<SettingsData | null>;
  updatePrimaryColor: (color: string) => Promise<void>;
  updateSecondaryColor: (color: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  // Table count specific methods
  getTableCount: () => number;
  updateTableCount: (count: number) => Promise<void>;
};

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { session } = useAuthContext();
  const {userData} = useAppStore();

  // Function to load settings from database
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        // console.log('No authenticated user found, using default settings');
        setSettings(defaultSettings);
        applyThemeColors(
          defaultSettings.primary_color,
          defaultSettings.secondary_color
        );
        setLoading(false);
        return;
      }

        // Get user profile to check role and business_id
        const userProfile = await getUserProfile(currentUser.id);
        if (!userProfile) {
          setLoading(false);
          return;
        }

        let settingsToUse: SettingsData | null = null;
        let settingsBusinessId: string | null = null;
        
        // For all users, use their business_id to get settings
        if (userProfile.business_id) {
          settingsBusinessId = userProfile.business_id;
          // console.log('Using business_id for settings:', settingsBusinessId);
        } else {
          // If somehow no business_id (this should be rare, only during onboarding)
          // console.log('User has no business_id. Using defaults.');
          setSettings({...defaultSettings, business_id: null});
          applyThemeColors(
            defaultSettings.primary_color,
            defaultSettings.secondary_color
          );
          setLoading(false);
          return;
        }
        
        // Now that we have the correct business ID, get the settings
        // console.log('Loading settings for business ID:', settingsBusinessId);
        settingsToUse = await getSettings(settingsBusinessId);
        
        if (settingsToUse) {
          // Settings exist, use them
          // console.log('Found existing settings:', settingsToUse);
          setSettings(settingsToUse);
          
          // Apply theme colors
          applyThemeColors(
            settingsToUse.primary_color,
            settingsToUse.secondary_color
          );
        } else if (userProfile.role === 'admin') {
          // Only create settings if the user is an admin
          // console.log('No settings found for admin. Creating default settings...');
          const newSettings = await createDefaultSettings(settingsBusinessId);
          
          if (newSettings) {
            // console.log('Successfully created default settings:', newSettings);
            setSettings(newSettings);
            
            // Apply theme colors
            applyThemeColors(
              defaultSettings.primary_color,
              defaultSettings.secondary_color
            );
          } else {
            // If database operation failed, use default settings locally
            console.error('Failed to create settings in database. Using local defaults.');
            setSettings({...defaultSettings, business_id: settingsBusinessId});
            
            // Apply theme colors
            applyThemeColors(
              defaultSettings.primary_color,
              defaultSettings.secondary_color
            );
            
            toast({
              title: "Warning",
              description: "Using default settings. Changes may not be saved.",
              variant: "destructive"
            });
          }
        } else {
          // Non-admin user with no settings found
          // console.log('No settings found for this business ID. Using defaults.');
          setSettings({...defaultSettings, business_id: settingsBusinessId});
          
          // Apply default theme colors
          applyThemeColors(
            defaultSettings.primary_color,
            defaultSettings.secondary_color
          );
        }
      } catch (error) {
        console.error('Error in loadSettings:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

  // Load settings when component mounts or when user changes
  useEffect(() => {
    if (userData) {
      // console.log('User authenticated, loading settings from database');
      loadSettings();
    } else {
      // User is not authenticated, use default settings
      // console.log('No user authenticated, using default settings');
      setSettings(defaultSettings);
      // Apply default theme colors
      applyThemeColors(
        defaultSettings.primary_color,
        defaultSettings.secondary_color
      );
      setLoading(false);
    }
  }, [userData, toast]);
  
  // Listen for auth state changes
  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // console.log('Auth state changed: SIGNED_IN, reloading settings');
        await loadSettings();
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Get current table count
  const getTableCount = useCallback((): number => {
    return settings.table_nos ?? 10; // Default to 10 if not set
  }, [settings.table_nos]);

  // Update table count
  const updateTableCount = useCallback(async (count: number): Promise<void> => {
    if (count < 1 || count > 100) {
      throw new Error('Table count must be between 1 and 100');
    }
    
    try {
      await updateSettings({ table_nos: count });
    } catch (error) {
      console.error('Error updating table count:', error);
      throw error; // Re-throw to allow error handling in the component
    }
  }, [settings.business_id]);

  // Update settings in database
  const updateSettings = async (updates: Partial<SettingsData>): Promise<SettingsData | null> => {
    if (!settings.business_id) {
      console.error('No business ID available');
      return null;
    }
    
    try {
      setLoading(true);
      
      // Get current user to check role
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }
      
      // Get user profile to check role
      const userProfile = await getUserProfile(user.id);
      if (!userProfile) {
        console.error('User profile not found');
        return null;
      }
      
      // Check if user has permission to update settings
      if (userProfile.role !== 'admin' && userProfile.role !== 'manager') {
        console.error('User does not have permission to update settings');
        return null;
      }
      
      // Update settings in database
      const updated = await updateSettingsInDB(settings.business_id, updates);
      
      if (updated) {
        // Update local state
        setSettings(prev => ({
          ...prev,
          ...updates
        }));
        
        // Apply theme colors if they were updated
        if (updates.primary_color || updates.secondary_color) {
          applyThemeColors(
            updates.primary_color ?? settings.primary_color,
            updates.secondary_color ?? settings.secondary_color
          );
        }
        
        toast({
          title: 'Settings updated',
          description: 'Your settings have been saved successfully.',
        });
      }
      
      return updated;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw to allow error handling in the component
    } finally {
      setLoading(false);
    }
  };

  // Update primary color
  const updatePrimaryColor = async (color: string) => {
    if (!settings.business_id) {
      console.error('No business ID found, cannot update color');
      return;
    }
    
    try {
      // Get current user to check role
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }
      
      // Get user profile to check role
      const userProfile = await getUserProfile(user.id);
      if (!userProfile) {
        console.error('User profile not found');
        return;
      }
      
      // Check if user has permission to update settings
      if (userProfile.role !== 'admin' && userProfile.role !== 'manager') {
        console.error('User does not have permission to update settings');
        return;
      }
      
      // Apply theme colors immediately for a responsive feel
      applyThemeColors(color, settings.secondary_color);
      
      // Directly update the settings table with the new color
      const { data, error } = await supabase
        .from('settings')
        .update({ primary_color: color })
        .eq('business_id', settings.business_id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating primary color in database:', error);
        // Revert to original color if there was an error
        applyThemeColors(settings.primary_color, settings.secondary_color);
        return;
      }
      
      // Update local state with the new color
      setSettings(prev => ({
        ...prev,
        primary_color: color
      }));
    } catch (error) {
      console.error('Error updating primary color:', error);
      // Revert to original color if there was an error
      applyThemeColors(settings.primary_color, settings.secondary_color);
    }
  };

  // Update secondary color
  const updateSecondaryColor = async (color: string) => {
    if (!settings.business_id) {
      console.error('No business ID found, cannot update color');
      return;
    }
    
    try {
      // Apply theme colors immediately for a responsive feel
      applyThemeColors(settings.primary_color, color);
      
      // Directly update the settings table with the new color
      const { data, error } = await supabase
        .from('settings')
        .update({ secondary_color: color })
        .eq('business_id', settings.business_id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating secondary color in database:', error);
        // Revert to original color if there was an error
        applyThemeColors(settings.primary_color, settings.secondary_color);
        return;
      }
      
      // Update local state with the new color
      setSettings(prev => ({
        ...prev,
        secondary_color: color
      }));
    } catch (error) {
      console.error('Error updating secondary color:', error);
      // Revert to original color if there was an error
      applyThemeColors(settings.primary_color, settings.secondary_color);
    }
  };

  // Reset settings to default (only theme colors)
  const resetToDefaults = async () => {
    if (!settings.business_id) {
      console.error('No business ID found, cannot reset theme');
      return;
    }
    
    try {
      // Apply theme colors immediately for a responsive feel
      applyThemeColors(defaultSettings.primary_color, defaultSettings.secondary_color);
      
      // Directly update the settings table with default colors
      const { data, error } = await supabase
        .from('settings')
        .update({
          primary_color: defaultSettings.primary_color,
          secondary_color: defaultSettings.secondary_color
        })
        .eq('business_id', settings.business_id)
        .select()
        .single();
      
      if (error) {
        console.error('Error resetting theme colors in database:', error);
        // Revert to original colors if there was an error
        applyThemeColors(settings.primary_color, settings.secondary_color);
        return;
      }
      
      // Update local state with default colors
      setSettings(prev => ({
        ...prev,
        primary_color: defaultSettings.primary_color,
        secondary_color: defaultSettings.secondary_color
      }));
    } catch (error) {
      console.error('Error resetting theme settings:', error);
      // Revert to original colors if there was an error
      applyThemeColors(settings.primary_color, settings.secondary_color);
    }
  };

  // Create dynamic style element for theme colors
  useEffect(() => {
    // Apply theme colors whenever settings change
    applyThemeColors(settings.primary_color, settings.secondary_color);
  }, [settings.primary_color, settings.secondary_color]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    settings,
    loading,
    updateSettings,
    updatePrimaryColor,
    updateSecondaryColor,
    resetToDefaults,
    getTableCount,
    updateTableCount,
  }), [
    settings, 
    loading, 
    updateSettings, 
    updatePrimaryColor, 
    updateSecondaryColor, 
    resetToDefaults, 
    getTableCount, 
    updateTableCount
  ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook to use the settings context
// Using function declaration instead of arrow function for better HMR compatibility
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
