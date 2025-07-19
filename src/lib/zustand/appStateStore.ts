import { create } from "zustand";


interface UserData {
  userId: string;
  profile_url: string;
  business_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'staff';
}

// Define Zustand store structure
export interface AppState {
  isInProgress: boolean;
  isSuccess: boolean;
  userData: UserData | null;

  setInProgress: (status: boolean) => void;
  setIsSuccess: (status: boolean) => void;
  setUserData: (info: UserData | null) => void;
  clearAllState: () => void; // 🚀 New function to reset everything!
}

// Create Zustand store
const useAppStore = create<AppState>((set) => ({
  isInProgress: false,
  isSuccess: false,
  userData: null,

  setInProgress: (status: boolean) =>
    set(() => ({
      isInProgress: status,
    })),

  setIsSuccess: (status: boolean) =>
    set(() => ({
      isSuccess: status,
    })),

  setUserData: (info: UserData | null) =>
    set(() => ({
      userData: info,
    })),

  clearAllState: () =>
    set(() => ({
      isInProgress: false,
      isSuccess: false,
      userData: null,
    })),
}));

export default useAppStore;
