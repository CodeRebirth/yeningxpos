import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '../components/ui/calendar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { format, isAfter, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { toast } from '../components/ui/use-toast';
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import useAppStore from '@/lib/zustand/appStateStore';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  business_id: string;
}

interface Attendance {
  id: string;
  user_id: string;
  business_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | null;
  notes: string | null;
}

export default function StaffAttendance() {
  // ...existing state
  const [punctualLoading, setPunctualLoading] = useState(true);
  const [punctualStaff, setPunctualStaff] = useState<User[]>([]);
  const [punctualAverages, setPunctualAverages] = useState<{ [userId: string]: number }>({});
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const { userData } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [adminId, setAdminId] = useState<string>('');

  useEffect(() => {
    if (!session || !userData) {
      navigate('/login');
      return;
    }
    // Restrict access to admin or manager only
    if (userData.role !== 'admin' && userData.role !== 'manager') {
      navigate('/dashboard');
      return;
    }
    fetchStaffAndAttendance();
  }, [session, selectedDate]);

  // Fetch all attendance for punctuality calculation
  useEffect(() => {
    const fetchPunctuality = async () => {
      if (!userData) return;
      setPunctualLoading(true);
      try {
        const businessId = userData.business_id;
        // Fetch all present attendance with check_in for this business
        const { data: allAttendance, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'present')
          .not('check_in', 'is', null);
        if (error) throw error;
        // Group check-ins by user
        const checkinMap: { [userId: string]: number[] } = {};
        (allAttendance || []).forEach(a => {
          if (!a.user_id || !a.check_in) return;
          const date = new Date(a.check_in);
          const minutes = date.getHours() * 60 + date.getMinutes();
          if (!checkinMap[a.user_id]) checkinMap[a.user_id] = [];
          checkinMap[a.user_id].push(minutes);
        });
        // Calculate averages
        const averages: { [userId: string]: number } = {};
        Object.entries(checkinMap).forEach(([userId, arr]) => {
          averages[userId] = arr.reduce((a, b) => a + b, 0) / arr.length;
        });
        setPunctualAverages(averages);
        // Sort staff by avg check-in time (ascending)
        const sortedStaff = (staff || [])
          .filter(member => averages[member.id] !== undefined)
          .sort((a, b) => averages[a.id] - averages[b.id])
          .slice(0, 3);
        setPunctualStaff(sortedStaff);
      } catch (err) {
        setPunctualStaff([]);
        setPunctualAverages({});
      } finally {
        setPunctualLoading(false);
      }
    };
    fetchPunctuality();
  }, [userData, staff]);
  
  // Auto-mark attendance when staff logs in (only for non-admin users)
  useEffect(() => {
    const autoMarkAttendance = async () => {
      if (!userData) return;
      
      // Check if the user is not an admin (staff member)
      if (userData.role !== 'admin') {
        const today = new Date();
        const formattedToday = format(today, 'yyyy-MM-dd');
        
        // Check if the user has already been marked for today
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userData.userId)
          .eq('date', formattedToday)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking attendance:', error);
          return;
        }
        
        // If no attendance record for today, mark as present
        if (!data) {
          try {
            
            // Create attendance record
            const now = new Date().toISOString();
            await supabase.from('attendance').insert([
              {
                user_id: userData.userId,
                business_id: userData.business_id,
                date: formattedToday,
                status: 'present',
                check_in: now,
                check_out: null
              }
            ]);
            
            toast({
              title: 'Attendance Marked',
              description: 'You have been marked present for today',
            });
          } catch (error) {
            console.error('Error auto-marking attendance:', error);
          }
        }
      }
    };
    
    autoMarkAttendance();
  }, [userData]);

  const fetchStaffAndAttendance = async () => {
    try {
      setLoading(true);
      
      // Get the current user's ID to use as business_id
      const businessId = userData?.business_id;
      if (!businessId) throw new Error('User ID not found');
      
      setAdminId(businessId);
      
      // Fetch staff members (users with the same business_id as admin's ID)
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', businessId);

      if (staffError) throw staffError;

      // Fetch attendance for selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));

      if (attendanceError) throw attendanceError;

      setStaff(staffData || []);
      setAttendance(attendanceData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch staff and attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (userId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const existingAttendance = attendance.find(a => a.user_id === userId);
      const date = format(selectedDate, 'yyyy-MM-dd');
      const now = new Date().toISOString();
      
      /* Removed console logging
      console.log('Marking attendance:', {
        userId,
        adminId,
        date,
        status,
        existingRecord: existingAttendance ? 'yes' : 'no'
      });
      */

      if (existingAttendance) {
        // Update existing attendance
        // console.log('Updating existing attendance record:', existingAttendance.id);
        const { data, error } = await supabase
          .from('attendance')
          .update({
            status,
            check_in: status === 'present' ? now : null,
            check_out: status === 'absent' ? now : null,
          })
          .eq('id', existingAttendance.id)
          .select();

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
        
        // console.log('Updated attendance:', data);
      } else {
        // Create new attendance record
        // console.log('Creating new attendance record');
        const newRecord = {
          user_id: userId,
          business_id: adminId, // Use admin's ID as business_id
          date,
          status,
          check_in: status === 'present' ? now : null,
          check_out: status === 'absent' ? now : null,
        };
        
        // console.log('New record data:', newRecord);
        
        const { data, error } = await supabase
          .from('attendance')
          .insert([newRecord])
          .select();

        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
        
        // console.log('Created attendance:', data);
      }

      await fetchStaffAndAttendance();
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
      });
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive',
      });
    }
  };

  const getAttendanceStatus = (userId: string) => {
    return attendance.find(a => a.user_id === userId)?.status || null;
  };
  
  const getStatusBadgeColor = (status: string | null) => {
    switch(status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusIcon = (status: string | null) => {
    switch(status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 h-[90vh] overflow-y-auto md:h-auto md:overflow-visible">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staff Attendance</h1>
        <div className="text-sm text-gray-500">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4 col-span-1 md:col-span-2 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Select Date</h2>
          <div className="flex justify-center items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => isAfter(startOfDay(date), endOfDay(new Date()))}
                className="rounded-md border p-auto"
              />
            </div>
          <div className="mt-6 flex justify-center space-x-3">
  <div className="w-3 h-3 rounded-full bg-green-500" title="Present"></div>
  <div className="w-3 h-3 rounded-full bg-red-500" title="Absent"></div>
  <div className="w-3 h-3 rounded-full bg-yellow-500" title="Late"></div>
</div>
        </Card>

        <Card className="p-4 col-span-1 md:col-span-2 lg:col-span-2 ">
          <h2 className="text-lg font-semibold mb-4">Attendance Sheet</h2>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No staff members found. Make sure users have your ID set as their business_id.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(getAttendanceStatus(member.id))}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(getAttendanceStatus(member.id))}`}>
                          {getAttendanceStatus(member.id) ? getAttendanceStatus(member.id).charAt(0).toUpperCase() + getAttendanceStatus(member.id).slice(1) : 'Not marked'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="icon"
                          variant={getAttendanceStatus(member.id) === 'present' ? 'default' : 'outline'}
                          onClick={() => markAttendance(member.id, 'present')}
                          className={`rounded-full p-2 ${getAttendanceStatus(member.id) === 'present' ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 text-green-700'}`}
                          aria-label="Mark Present"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={getAttendanceStatus(member.id) === 'absent' ? 'default' : 'outline'}
                          onClick={() => markAttendance(member.id, 'absent')}
                          className={`rounded-full p-2 ${getAttendanceStatus(member.id) === 'absent' ? 'bg-red-100 text-red-700' : 'hover:bg-red-50 text-red-700'}`}
                          aria-label="Mark Absent"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={getAttendanceStatus(member.id) === 'late' ? 'default' : 'outline'}
                          onClick={() => markAttendance(member.id, 'late')}
                          className={`rounded-full p-2 ${getAttendanceStatus(member.id) === 'late' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-yellow-50 text-yellow-700'}`}
                          aria-label="Mark Late"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Most Punctual Staff Row */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Most Punctual Staff</h3>
        {punctualLoading ? (
          <div className="flex items-center space-x-2 text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
        ) : punctualStaff.length === 0 ? (
          <div className="text-gray-500">No punctuality data available.</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {punctualStaff.map(member => (
              <div key={member.id} className="flex items-center space-x-2 bg-gray-50 rounded-full px-4 py-2 shadow-sm">
                <span className="font-medium">{member.first_name} {member.last_name}</span>
                <span className="text-xs text-gray-500">(
                  {punctualAverages[member.id] !== undefined ?
                    `${Math.floor(punctualAverages[member.id] / 60).toString().padStart(2, '0')}:${Math.round(punctualAverages[member.id] % 60).toString().padStart(2, '0')}`
                    : '--:--'}
                )</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
