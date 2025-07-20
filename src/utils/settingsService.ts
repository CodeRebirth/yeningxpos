import { supabase } from '@/integrations/supabase/client';

// Types
export type SettingsData = {
  business_id: string | null;
  primary_color: string;
  secondary_color: string;
  tax_rate: number; // Changed to number to match database schema
  address: string;
  phone_number: string;
  business_name: string;
  table_nos: number; // Number of tables for reservations
};

// Default settings with no hardcoded business data
export const defaultSettings: SettingsData = {
  business_id: null,
  primary_color: '#FF7700', // Default primary color
  secondary_color: '#7c3aed', // Default secondary color
  tax_rate: 5.0, // Default tax rate
  address: '',
  phone_number: '',
  business_name: '',
  table_nos: 10, // Default number of tables
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return data.user;
};

// Get user profile with additional details
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

// Get settings for a business
export const getSettings = async (businessId: string): Promise<SettingsData | null> => {
  try {
    // console.log('Fetching settings for business ID:', businessId);
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (error) {
      // If no rows returned, it's not really an error for our purposes
      if (error.code === 'PGRST116') {
        // console.log('No settings found for this business ID');
        return null;
      }
      console.error('Error fetching settings:', error);
      return null;
    }
    
    // console.log('Settings found:', data);
    return data as SettingsData;
  } catch (error) {
    console.error('Error in getSettings:', error);
    return null;
  }
};

// Get settings for a staff user by finding their admin's settings
export const getStaffSettings = async (userId: string): Promise<SettingsData | null> => {
  try {
    // console.log('Getting settings for staff user:', userId);
    
    // First, get the user profile to find the business_id (admin's ID)
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.business_id) {
      // console.log('No business ID found for staff user');
      return null;
    }
    
    // Use the business_id to get the admin's settings
    const adminId = userProfile.business_id;
    // console.log('Found business ID for staff user:', adminId);
    
    // Get the admin's settings
    return await getSettings(adminId);
  } catch (error) {
    console.error('Error in getStaffSettings:', error);
    return null;
  }
};

// Create default settings for a business with actual business data
export const createDefaultSettings = async (businessId: string): Promise<SettingsData | null> => {
  try {
    if (!businessId) {
      console.error('No business ID provided for creating settings');
      return null;
    }
    
    // First get the business information to use in settings
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('name, address, phone, email')
      .eq('id', businessId)
      .single();
    
    if (businessError) {
      console.error('Error fetching business data:', businessError);
      // Continue with default values if business data can't be fetched
    }
    
    // Create settings using business data if available
    const newSettings = { 
      ...defaultSettings,
      business_id: businessId,
      tax_rate: defaultSettings.tax_rate,
      primary_color: defaultSettings.primary_color,
      secondary_color: defaultSettings.secondary_color,
      // Use business data if available, otherwise use empty strings
      business_name: businessData?.name || '',
      address: businessData?.address || '',
      phone_number: businessData?.phone || ''
    };
    
    // Use upsert to handle both insert and update cases
    const { data, error } = await supabase
      .from('settings')
      .upsert([newSettings], { onConflict: 'business_id' })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating settings:', error);
      return null;
    }
    
    // Apply theme colors immediately
    applyThemeColors(newSettings.primary_color, newSettings.secondary_color);
    
    return data as SettingsData;
  } catch (error) {
    console.error('Error in createDefaultSettings:', error);
    return null;
  }
};

// Update settings and business data in a coordinated way
export const updateSettings = async (
  businessId: string, 
  updates: Partial<SettingsData>
): Promise<SettingsData | null> => {
  try {
    if (!businessId) {
      console.error('No business ID provided for update');
      return null;
    }
    
    // Process updates to ensure correct data types
    const processedUpdates: Record<string, any> = {};
    
    // Copy all updates to processed updates
    Object.keys(updates).forEach(key => {
      processedUpdates[key] = updates[key as keyof Partial<SettingsData>];
    });
    
    // Special handling for tax_rate to ensure it's a number
    if (updates.tax_rate !== undefined) {
      const numericTaxRate = Number(updates.tax_rate);
      if (isNaN(numericTaxRate)) {
        console.error('Invalid tax rate:', updates.tax_rate);
        return null;
      }
      processedUpdates.tax_rate = numericTaxRate;
    }
    
    // Always include the business_id in the settings update
    processedUpdates.business_id = businessId;
    
    // Step 1: Update business table if needed
    if (updates.business_name || updates.address || updates.phone_number) {
      const businessUpdates: Record<string, any> = {};
      
      if (updates.business_name) businessUpdates.name = updates.business_name;
      if (updates.address) businessUpdates.address = updates.address;
      if (updates.phone_number) businessUpdates.phone = updates.phone_number;
      
      if (Object.keys(businessUpdates).length > 0) {
        const { error: businessError } = await supabase
          .from('businesses')
          .update(businessUpdates)
          .eq('id', businessId);
        
        if (businessError) {
          console.error('Error updating business information:', businessError);
          // Continue with settings update even if business update fails
        }
      }
    }
    
    // Step 2: Update settings table
    // First check if a settings record exists
    const { data: existingSettings, error: checkError } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();
    
    let data, error;
    
    if (checkError) {
      console.error('Error checking existing settings:', checkError);
      return null;
    }
    
    if (existingSettings) {
      // If settings exist, update them
      const { data: updateData, error: updateError } = await supabase
        .from('settings')
        .update(processedUpdates)
        .eq('business_id', businessId)
        .select()
        .single();
      
      data = updateData;
      error = updateError;
    } else {
      // If settings don't exist, insert them
      const { data: insertData, error: insertError } = await supabase
        .from('settings')
        .insert([processedUpdates])
        .select()
        .single();
      
      data = insertData;
      error = insertError;
    }
    
    if (error) {
      console.error('Error updating settings:', error);
      return null;
    }
    
    return data as SettingsData;
  } catch (error) {
    console.error('Error in updateSettings:', error);
    return null;
  }
};

// Helper function to adjust color brightness
export function adjustColor(color: string, amount: number): string {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  // Adjust brightness
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Apply theme colors to CSS variables
export const applyThemeColors = (primaryColor: string, secondaryColor: string) => {
  try {
    // Use the provided colors directly, falling back to defaults if needed
    const finalPrimaryColor = primaryColor || defaultSettings.primary_color;
    const finalSecondaryColor = secondaryColor || defaultSettings.secondary_color;
    
    // Get the root element to set CSS variables
    const root = document.documentElement;
    
    // Convert colors to HSL for variants
    const primaryHSL = hexToHSL(finalPrimaryColor);
    const secondaryHSL = hexToHSL(finalSecondaryColor);
    
    // Set primary color and variants - ensure we set both variable formats for compatibility
    root.style.setProperty('--primary', finalPrimaryColor);
    root.style.setProperty('--primary-color', finalPrimaryColor); // For sidebar and other components
    root.style.setProperty('--primary-foreground', primaryHSL.l > 60 ? '#000000' : '#ffffff');
    
    // Create lighter and darker variants of primary
    root.style.setProperty('--primary-light', `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${Math.min(primaryHSL.l + 15, 95)}%)`);
    root.style.setProperty('--primary-dark', `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${Math.max(primaryHSL.l - 15, 5)}%)`);
    
    // Set secondary color and variants - ensure we set both variable formats for compatibility
    root.style.setProperty('--secondary', finalSecondaryColor);
    root.style.setProperty('--secondary-color', finalSecondaryColor); // For sidebar and other components
    root.style.setProperty('--secondary-foreground', secondaryHSL.l > 60 ? '#000000' : '#ffffff');
    
    // Create lighter and darker variants of secondary
    root.style.setProperty('--secondary-light', `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${Math.min(secondaryHSL.l + 15, 95)}%)`);
    root.style.setProperty('--secondary-dark', `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${Math.max(secondaryHSL.l - 15, 5)}%)`);
    
    // Set accent colors based on primary
    root.style.setProperty('--accent', `hsl(${primaryHSL.h}, ${Math.max(primaryHSL.s - 15, 0)}%, ${primaryHSL.l}%)`);
    root.style.setProperty('--accent-foreground', primaryHSL.l > 60 ? '#000000' : '#ffffff');
    
    // Set additional UI component colors for compatibility with existing components
    root.style.setProperty('--sidebar-primary', finalPrimaryColor);
    root.style.setProperty('--sidebar-ring', finalPrimaryColor);
    root.style.setProperty('--button-primary', finalPrimaryColor);
    root.style.setProperty('--button-primary-hover', adjustColor(finalPrimaryColor, -20));
    root.style.setProperty('--accent-color', finalPrimaryColor);
    root.style.setProperty('--ring', finalPrimaryColor);
    root.style.setProperty('--chart-primary', finalPrimaryColor);
    root.style.setProperty('--chart-secondary', finalSecondaryColor);
    
    // console.log('Theme colors applied successfully', { finalPrimaryColor, finalSecondaryColor });
  } catch (error) {
    console.error('Error applying theme colors:', error);
  }
};

// Convert hex color to HSL values
export const hexToHSL = (hex: string): { h: number, s: number, l: number } => {
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find the min and max values to calculate the lightness
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  // Calculate the hue and saturation
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return { h, s, l };
}
