import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Reservation } from '../types/Reservation';
import { useSettings } from '../context/SettingsContext';
import { Loader2 } from 'lucide-react';

type ReservationFormData = Omit<Reservation, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'finished';
};

interface ReservationFormProps {
  onSubmit: (data: Omit<Reservation, 'id' | 'created_by' | 'created_at' | 'status'>) => Promise<void>;
  initial?: Partial<Omit<Reservation, 'id' | 'created_by' | 'created_at' | 'status'>>;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ onSubmit, initial = {} }) => {
  const [formData, setFormData] = useState<Omit<Reservation, 'id' | 'created_by' | 'created_at' | 'status'>>({
    name: initial.name || '',
    phone: initial.phone || '',
    date: initial.date || '',
    time: initial.time || '',
    note: initial.note || '',
    table_number: initial.table_number || 1,
  });

  const [availableTables, setAvailableTables] = useState<number[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const { settings, loading: isLoadingSettings, getTableCount } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get total tables from settings with a safe fallback
  const totalTables = getTableCount();
  
  // Generate array of table numbers from 1 to totalTables
  const tableNumbers = React.useMemo(() => {
    const count = Math.max(1, Math.min(100, totalTables)); // Ensure between 1 and 100
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [totalTables]);
  
  // Settings are automatically loaded by the SettingsProvider
  // No need to manually refresh on mount

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.date) {
      setError('Date is required');
      return false;
    }
    if (!formData.time) {
      setError('Time is required');
      return false;
    }
    return true;
  };

  // Fetch available tables for the selected date and time
  useEffect(() => {
    const fetchAvailableTables = async () => {
      console.log('Fetching available tables...');
      console.log('Current form data:', formData);
      
      // If no date or time is set, show all tables
      if (!formData.date || !formData.time) {
        console.log('No date or time selected, showing all tables');
        const allTables = Array.from({ length: totalTables }, (_, i) => i + 1);
        setAvailableTables(allTables);
        setIsLoadingTables(false);
        return;
      }
      
      try {
        setIsLoadingTables(true);
        
        // Format the date and time for the query
        const [year, month, day] = formData.date.split('-').map(Number);
        const [hours, minutes] = formData.time.split(':').map(Number);
        const selectedDateTime = new Date(year, month - 1, day, hours, minutes);
        
        // Get all reservations for the selected date
        const { data: reservations, error } = await supabase
          .from('reservations')
          .select('table_number, date, time')
          .eq('date', formData.date);
          
        if (error) throw error;
        
        // Filter out tables that are already reserved for the selected time slot
        const reservedTables = new Set<number>();
        
        reservations?.forEach(reservation => {
          const [resYear, resMonth, resDay] = reservation.date.split('-').map(Number);
          const [resHours, resMinutes] = reservation.time.split(':').map(Number);
          const reservationTime = new Date(resYear, resMonth - 1, resDay, resHours, resMinutes);
          
          // If the reservation is within 2 hours of the selected time, mark the table as reserved
          const timeDiff = Math.abs(selectedDateTime.getTime() - reservationTime.getTime());
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          if (hoursDiff < 2) {
            reservedTables.add(reservation.table_number);
          }
        });
        
        // Generate array of available tables (1 to totalTables) that aren't reserved
        const available = tableNumbers.filter(tableNum => !reservedTables.has(tableNum));
        
        setAvailableTables(available);
        
        // If the current table number is not available, reset it to the first available table
        if (formData.table_number && !available.includes(formData.table_number)) {
          setFormData(prev => ({
            ...prev,
            table_number: available[0] || tableNumbers[0] || 1
          }));
        }
      } catch (err) {
        console.error('Error fetching available tables:', err);
        setError('Failed to load table availability');
      } finally {
        setIsLoadingTables(false);
      }
    };
    
    fetchAvailableTables();
  }, [formData.date, formData.time, tableNumbers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingTables) {
      alert('Please wait while we check table availability...');
      return;
    }
    setError(null);
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      // Reset form on successful submission
      if (!initial.name) setFormData(prev => ({ ...prev, name: '' }));
      if (!initial.phone) setFormData(prev => ({ ...prev, phone: '' }));
      if (!initial.date) setFormData(prev => ({ ...prev, date: '' }));
      if (!initial.time) setFormData(prev => ({ ...prev, time: '' }));
      if (!initial.note) setFormData(prev => ({ ...prev, note: '' }));
      if (!initial.table_number) setFormData(prev => ({ ...prev, table_number: 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reservation');
      throw err; // Re-throw to allow parent to handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default time to next hour if no time is set
  React.useEffect(() => {
    if (!initial.time && !formData.time) {
      const now = new Date();
      const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
      const timeString = nextHour.toTimeString().slice(0, 5);
      setFormData({ ...formData, time: timeString });
    }
    
    // Set default date to today if no date is set
    if (!initial.date && !formData.date) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({ ...formData, date: today });
    }
  }, [initial.date, initial.time]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isSubmitting}
            placeholder="Customer name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isSubmitting}
            placeholder="+1 (___) ___-____"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
          <input
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Table Number
          {isLoadingTables && (
            <span className="ml-2 text-xs text-gray-500">
              (checking availability...)
            </span>
          )}
        </label>
        <select
          value={formData.table_number || ''}
          onChange={e => setFormData({ ...formData, table_number: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isSubmitting || isLoadingTables || isLoadingSettings}
          required
        >
          {isLoadingSettings ? (
            <option value="">Loading table numbers...</option>
          ) : availableTables.length > 0 ? (
            availableTables.map(tableNum => (
              <option key={tableNum} value={tableNum}>
                Table {tableNum}
              </option>
            ))
          ) : (
            <option value="" disabled>No tables available for this time slot</option>
          )}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {availableTables.length > 0 
            ? `${availableTables.length} table(s) available`
            : 'No tables available for selected time'}
        </p>
        {!isLoadingTables && availableTables.length === 0 && (
          <p className="mt-1 text-sm text-yellow-600">
            No tables available for the selected date and time. Please choose a different time.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
        <textarea
          value={formData.note || ''}
          onChange={e => setFormData({ ...formData, note: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={3}
          disabled={isSubmitting}
          placeholder="Any special requests or notes"
        />
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting 
              ? 'bg-primary-400' 
              : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              {initial.name ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{initial.name ? 'Update Reservation' : 'Create Reservation'}</>
          )}
        </button>
      </div>
    </form>
  );
};

export default ReservationForm;
