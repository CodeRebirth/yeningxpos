
import React from 'react';
import { cn } from '@/lib/utils';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton = ({ active, onClick, children }: TabButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-md text-sm font-medium transition-colors",
        active 
          ? "bg-gray-600 text-white" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      )}
    >
      {children}
    </button>
  );
};

export default TabButton;
