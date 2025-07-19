// src/utils/marketingApi.ts
import { supabase } from '@/integrations/supabase/client';

export interface Campaign {
  id?: string;
  business_id: string;
  name: string;
  message_template: string;
  target_segment: 'all' | 'highValue' | 'frequent' | 'inactive';
  segment_criteria?: {
    min_spent?: number;
    min_orders?: number;
    inactive_days?: number;
  };
  status: 'draft' | 'scheduled' | 'sent' | 'completed' | 'failed';
  scheduled_date?: string;
  sent_date?: string;
  recipient_count: number;
  open_rate?: number;
  response_rate?: number;
  created_at?: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  read: number;
  responded: number;
}

// Create a new marketing campaign
export const createCampaign = async (campaign: Omit<Campaign, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert(campaign)
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }

  return data;
};

// Get all campaigns for a business
export const getCampaigns = async (businessId: string) => {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }

  return data || [];
};

// Get a single campaign by ID
export const getCampaign = async (campaignId: string) => {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }

  return data;
};

// Update a campaign
export const updateCampaign = async (campaignId: string, updates: Partial<Campaign>) => {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }

  return data;
};

// Delete a campaign
export const deleteCampaign = async (campaignId: string) => {
  const { error } = await supabase
    .from('marketing_campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }

  return true;
};

// Send a campaign immediately
export const sendCampaign = async (campaignId: string) => {
  // In a real implementation, this would connect to WhatsApp Business API
  // For now, we'll simulate the API call by updating the campaign status
  
  // First, update the campaign status to 'sent'
  const { data: campaign, error: updateError } = await supabase
    .from('marketing_campaigns')
    .update({
      status: 'sent',
      sent_date: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating campaign status:', updateError);
    throw updateError;
  }

  // Then, create message records for each recipient
  // In a real implementation, this would be handled by the WhatsApp API
  // For now, we'll simulate it with a success message
  
  return {
    success: true,
    campaign,
    message: `Campaign "${campaign.name}" sent to ${campaign.recipient_count} recipients`
  };
};

// Get campaign statistics
export const getCampaignStats = async (campaignId: string): Promise<CampaignStats> => {
  // In a real implementation, this would fetch actual stats from the WhatsApp API
  // For now, we'll return simulated stats
  
  const { data: campaign, error } = await supabase
    .from('marketing_campaigns')
    .select('recipient_count')
    .eq('id', campaignId)
    .single();

  if (error) {
    console.error('Error fetching campaign for stats:', error);
    throw error;
  }

  const recipientCount = campaign.recipient_count;
  
  // Generate simulated stats
  const delivered = Math.floor(recipientCount * 0.95); // 95% delivery rate
  const read = Math.floor(delivered * 0.7); // 70% of delivered are read
  const responded = Math.floor(read * 0.2); // 20% of read get responses
  
  return {
    sent: recipientCount,
    delivered,
    read,
    responded
  };
};

// Create a WhatsApp message template for approval
export const createWhatsAppTemplate = async (
  businessId: string,
  templateName: string,
  templateContent: string,
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
) => {
  // In a real implementation, this would submit the template to WhatsApp for approval
  // For now, we'll simulate the API call
  
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({
      business_id: businessId,
      name: templateName,
      content: templateContent,
      category,
      status: 'pending_approval'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating WhatsApp template:', error);
    throw error;
  }

  return {
    success: true,
    template: data,
    message: `Template "${templateName}" submitted for approval`
  };
};
