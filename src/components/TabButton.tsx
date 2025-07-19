
import React from 'react';
import { cn } from '@/lib/utils';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const getPrimaryColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#0891b2';

const TabButton = ({ active, onClick, children }: TabButtonProps) => {
  const accent = getPrimaryColor();
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-5 py-2 rounded-full text-sm font-semibold focus:outline-none transition-all duration-200",
        "bg-white/60 shadow-sm",
        active
          ? "text-[var(--primary-color)]"
          : "text-gray-500 hover:text-[var(--primary-color)]"
      )}
      style={active ? {
        background: `linear-gradient(90deg, ${accent}11 0%, #fff 100%)`,
        fontWeight: 700
      } : {}}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {active && (
        <span
          className="absolute left-4 right-4 -bottom-1 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accent}99 0%, ${accent}33 100%)`,
            boxShadow: `0 2px 8px 0 ${accent}44`,
            opacity: 0.8
          }}
        />
      )}
    </button>
  );
};

export default TabButton;
