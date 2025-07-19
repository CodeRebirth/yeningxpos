
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-viilare-500 mb-4">404</h1>
        <p className="text-2xl text-gray-600 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Button 
          onClick={() => navigate('/')} 
          className="bg-viilare-500 hover:bg-viilare-600"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
