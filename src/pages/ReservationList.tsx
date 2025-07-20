import React, { useEffect, useState } from 'react';
import { Reservation, ReservationStatus } from '../types/Reservation';
import ReservationForm from '../components/ReservationForm';
import { supabase } from '../integrations/supabase/client';
import { useAuthContext } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { Loader2 } from 'lucide-react';

const ReservationList: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuthContext();
  const { settings: businessSettings } = useBusiness();
  const totalTables = businessSettings?.table_nos || 10;
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Fetch reservations from Supabase
  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (fetchError) throw fetchError;
      // Only update if data has changed to prevent unnecessary re-renders
      setReservations(prevReservations => {
        const stringifiedPrev = JSON.stringify(prevReservations);
        const stringifiedNew = JSON.stringify(data || []);
        return stringifiedPrev === stringifiedNew ? prevReservations : (data || []);
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError('Failed to load reservations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReservations();
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchReservations();
  }, []);
  
  // Handle adding a new reservation
  const handleAddReservation = async (data: Omit<Reservation, 'id' | 'created_by' | 'created_at' | 'status'>) => {
    if (!session?.user?.id) {
      setError('You must be logged in to create a reservation');
      return;
    }
    
    // Validate table number
    if (!data.table_number || data.table_number < 1 || data.table_number > totalTables) {
      setError('Please select a valid table number');
      return;
    }
    
    try {
      const { data: savedReservation, error } = await supabase
        .from('reservations')
        .insert([{
          ...data,
          created_by: session.user.id,
          status: 'pending',
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Refresh the list after successful creation
      await fetchReservations();
      
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
      throw err;
    }
  };
  
  // Handle updating reservation status
  const handleStatusUpdate = async (id: string, newStatus: ReservationStatus) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh the list after successful update
      await fetchReservations();
      
    } catch (err) {
      console.error('Error updating reservation status:', err);
      setError('Failed to update reservation status. Please try again.');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Table Reservations</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium mb-4">New Reservation</h2>
          <ReservationForm onSubmit={handleAddReservation} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No reservations found
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reservation.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(reservation.date)} at {formatTime(reservation.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Table {reservation.table_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={reservation.note || ''}>
                      {reservation.note || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        reservation.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : reservation.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : reservation.status === 'finished'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, 'finished')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Mark as Finished
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReservationList;
