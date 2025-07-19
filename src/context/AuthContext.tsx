import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import useAppStore from "@/lib/zustand/appStateStore";
import { signIn, signUp } from "@/lib/auth";
import { Loader2 } from "lucide-react";

type AuthContextType = {
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: "admin" | "manager" | "staff"
  ) => Promise<any>;
  signOut: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { setUserData , clearAllState } = useAppStore();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);

      if (sessionData.session) {
        fetchUserData(sessionData.session.user.id);
      }

      setLoading(false);
    };

    const fetchUserData = async (userId: string) => {
      const { data: userInfo, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      // console.log("User Info:", userInfo);

      if (error) {
        console.error("Error fetching user data:", error);
      } else {
        setUserData({
          userId: userInfo.id,
          profile_url: userInfo.id.profile_url,
          business_id: userInfo.business_id,
          email: userInfo.email,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          role: userInfo.role,
        });
      }
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) fetchUserData(newSession.user.id);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []); // 🔥 No unnecessary re-renders

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password);
      return result;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: "admin" | "manager" | "staff" = "admin"
  ) => {
    try {
      const result = await signUp(email, password, firstName, lastName, role);
      return result;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserData(null); // Clear user data on sign out
      clearAllState(); // Clear all app state
      console.log("User signed out successfully");
      return true;
    } catch {
      return false;
    }
  };

  const value = {
    session,
    setSession,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut,
  };

  return (
    <AuthContext.Provider
      value={{ session, setSession, loading, signIn, signUp, signOut }}
    >
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
