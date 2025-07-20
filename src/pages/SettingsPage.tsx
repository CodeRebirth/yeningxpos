import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function SettingsPage() {
  const { settings, updateSettings, loading, refreshSettings } = useBusiness();
  const [formData, setFormData] = useState({
    business_name: '',
    table_nos: 10, // Changed from total_tables to table_nos to match our schema
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form with current settings
  useEffect(() => {
    console.log('Settings changed:', settings);
    if (settings) {
      console.log('Updating form data with settings:', {
        business_name: settings.business_name,
        table_nos: settings.table_nos
      });
      setFormData(prev => ({
        ...prev,
        business_name: settings.business_name || '',
        table_nos: settings.table_nos || 10,
      }));
    } else {
      console.log('No settings available yet');
    }
  }, [settings]);
  
  // Debug form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);
  
  // Refresh settings on mount to ensure we have the latest
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Ensure table_nos is a valid number between 1 and 100
      const tableNos = Math.max(1, Math.min(100, Number(formData.table_nos) || 10));
      
      await updateSettings({
        business_name: formData.business_name.trim(),
        table_nos: tableNos,
      });
      
      // Refresh settings to ensure UI is in sync
      await refreshSettings();
      
      setMessage({ 
        type: 'success', 
        text: 'Settings saved successfully! The changes will be reflected across the application.' 
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Business Settings</h1>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Enter business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table_nos">Number of Tables</Label>
              <Input
                id="table_nos"
                type="number"
                min="1"
                max="100"
                value={formData.table_nos}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  setFormData(prev => ({ ...prev, table_nos: value }));
                }}
                className="w-32"
                disabled={isSaving}
              />
              <p className="text-sm text-muted-foreground">
                This determines how many tables are available for reservations (1-100).
              </p>
            </div>

            {message && (
              <div className={`p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
