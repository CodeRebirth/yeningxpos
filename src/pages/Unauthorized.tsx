
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
        <div className="text-7xl mb-6">🔒</div>
        <p className="text-gray-600 mb-6">
          Sorry, you don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            Go to Dashboard
          </Button>
          <Button 
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
