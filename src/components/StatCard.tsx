
import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

const StatCard = ({ title, value, subtitle, icon }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <h2 className="text-2xl font-bold mt-1">{value}</h2>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && <div className="text-viilare-500">{icon}</div>}
      </div>
    </div>
  );
};

export default StatCard;
