import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import useAppStore from '@/lib/zustand/appStateStore';

// Define the shape of our settings
type BusinessSettings = {
  id?: string;
  business_id?: string;
  business_name?: string;
  total_tables?: number;
  table_nos?: number; // Total number of tables (1 to table_nos)
  [key: string]: any; // Allow for additional fields
};

type BusinessContextType = {
  settings: BusinessSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<BusinessSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentBusinessId = useAppStore((state) => state.userData?.business_id);

  // Default settings if none are found
  const defaultSettings: BusinessSettings = {
    business_name: 'My Business',
    total_tables: 10,
    table_nos: 10,
  };

  const fetchSettings = useCallback(async () => {
    if (!currentBusinessId) {
      console.log('No business ID available, using default settings');
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 [BusinessContext] Fetching settings for business: ${currentBusinessId}`);
      
      // Get settings for the current business
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('business_id', currentBusinessId)
        .limit(1);

      if (error) {
        console.error('❌ [BusinessContext] Database error:', error);
        throw error;
      }
      
      console.log('📊 [BusinessContext] Fetched settings:', data);
      
      let savedSettings = null;
      
      // If no settings found, create default settings for this business
      if (!data || data.length === 0) {
        console.log('ℹ️ [BusinessContext] No settings found for this business, creating default settings');
        const { data: newSettings, error: createError } = await supabase
          .from('settings')
          .insert([{
            ...defaultSettings,
            business_id: currentBusinessId
          }])
          .select()
          .single();

        if (createError) throw createError;
        
        console.log('✅ [BusinessContext] Created default settings:', newSettings);
        savedSettings = newSettings;
      } else {
        savedSettings = data[0];
      }
      
      // Merge with defaults to ensure all fields exist
      const mergedSettings = { 
        ...defaultSettings, 
        ...savedSettings,
        // Ensure we have a valid table_nos
        table_nos: savedSettings.table_nos || defaultSettings.table_nos,
        // Ensure business_id is set
        business_id: currentBusinessId
      };
      
      console.log('🔄 [BusinessContext] Using settings:', mergedSettings);
      setSettings(mergedSettings);
      setError(null);
    } catch (err) {
      console.error('💥 [BusinessContext] Error in fetchSettings:', err);
      // If there's an error, use default settings with current business ID
      setSettings({
        ...defaultSettings,
        business_id: currentBusinessId || undefined
      });
      setError(`Failed to load business settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  const updateSettings = async (updates: Partial<BusinessSettings>) => {
    try {
      setLoading(true);
      
      // If we have an ID, update existing settings, otherwise create new
      if (settings?.id) {
        const { data, error } = await supabase
          .from('settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        setSettings({ ...settings, ...data });
      } else {
        // Create new settings if none exist
        const { data, error } = await supabase
          .from('settings')
          .insert([updates])
          .select()
          .single();
          
        if (error) throw error;
        setSettings({ ...defaultSettings, ...data, ...updates });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error updating business settings:', err);
      setError('Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <BusinessContext.Provider 
      value={{ 
        settings, 
        loading, 
        error, 
        updateSettings,
        refreshSettings
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
