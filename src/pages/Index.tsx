
import { useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuthContext();

  useEffect(() => {
      if (!loading && session) {
        // Only redirect to home if we have a session
        navigate('/');
      }
    }, [session, loading, navigate]);

  // Show loading indicator while checking authentication
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-viilare-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading VIILARE POS...</p>
      </div>
    </div>
  );
};

export default Index;
