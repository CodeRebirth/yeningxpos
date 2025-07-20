export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'finished';

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // 24h time (HH:mm)
  table_number: number;
  note?: string;
  created_by: string; // user id or name
  created_at: string; // timestamp
  status: ReservationStatus;
}

