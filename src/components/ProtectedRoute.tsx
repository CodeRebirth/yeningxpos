import { ReactNode, useEffect, useState, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import useAppStore from '@/lib/zustand/appStateStore';


interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'staff')[];
}

const ProtectedRoute = ({
  children,
  allowedRoles = []
}: ProtectedRouteProps) => {
  const {userData} = useAppStore();
  const { session, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingBusiness, setCheckingBusiness] = useState(true);
  const [businessChecked, setBusinessChecked] = useState(false);
  const lastNavigationTime = useRef(0);
  const PUBLIC_PATHS = ['/login', '/business-setup', '/unauthorized', '/pos'];
  
  // Function to check if navigation should be allowed
  const shouldAllowNavigation = (path: string) => {
    const now = Date.now();
    
    // Don't throttle navigation during initial auth check
    if (loading) return true;
    
    // If path is login, only allow navigation if we're sure there's no session
    if (path === '/login' && session) {
      return false;
    }
    
    // Standard throttling for other cases
    const throttleTime = 500; // Reduced throttle time for better responsiveness
    
    if (now - lastNavigationTime.current < throttleTime) {
      return false;
    }
    if (location.pathname === path) {
      return false;
    }
    
    lastNavigationTime.current = now;
    return true;
  };

  // Safe navigation function with debouncing
  const safeNavigate = (path: string) => {
    if (shouldAllowNavigation(path)) {
      // Use replace: true to prevent back button issues
      navigate(path, { 
        replace: true,
        state: { from: location.pathname }
      });
    }
  };
  
  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // If we're already on a public path, no need to check or redirect
    if (PUBLIC_PATHS.includes(location.pathname)) {
      setCheckingBusiness(false);
      return;
    }

    // Only redirect to login if we're done loading and there's definitely no session
    if (!loading && !session) {
      safeNavigate('/login');
      setCheckingBusiness(false);
      return;
    }

    // If we have a session but no user data yet, wait for it
    if (session && !userData) {
      return;
    }

    const checkBusinessSetup = async () => {
      try {
        setCheckingBusiness(true);

        // Admin without business setup should be redirected
        if (userData.role === 'admin' && !userData.business_id && location.pathname !== '/business-setup') {
          safeNavigate('/business-setup');
          return;
        }
        
        // Staff users should be redirected to POS if trying to access root
        if (userData.role === 'staff' && location.pathname === '/') {
          safeNavigate('/pos');
          return;
        }
        
        // If no roles required or user is admin, allow access
        if (allowedRoles.length === 0 || userData.role === 'admin') {
          setBusinessChecked(true);
          setCheckingBusiness(false);
          return;
        }
        
        // Check if user has required role
        if (userData.role && allowedRoles.includes(userData.role as any)) {
          setBusinessChecked(true);
          setCheckingBusiness(false);
          return;
        }
        
        // Handle unauthorized access
        if (userData.role === 'staff') {
          safeNavigate('/pos');
        } else {
          safeNavigate('/unauthorized');
        }
      } finally {
        setCheckingBusiness(false);
      }
    };
    
    if (!businessChecked) {
      checkBusinessSetup();
    }
  }, [userData, loading, navigate, allowedRoles, location.pathname, businessChecked, session]);

  // Show loading state while checking auth
  if (loading || checkingBusiness) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If on a public path or if we have both session and user data, render children
  return (PUBLIC_PATHS.includes(location.pathname) || (session && userData)) ? <>{children}</> : null;
};

export default ProtectedRoute;
