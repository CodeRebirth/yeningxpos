interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

import React, { ReactNode, useEffect, useRef, useState } from 'react';

const getPrimaryColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#0891b2';

const StatCard = ({ title, value, subtitle, icon }: StatCardProps) => {
  // Animate value if it's a number
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (typeof value === 'number' && typeof prevValue.current === 'number') {
      const start = prevValue.current;
      const end = value;
      const duration = 700;
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.round(start + (end - start) * progress);
        setDisplayValue(current);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          prevValue.current = value;
        }
      };
      requestAnimationFrame(step);
    } else {
      setDisplayValue(value);
      prevValue.current = value;
    }
  }, [value]);

  const accent = getPrimaryColor();

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl bg-white/70 backdrop-blur-lg border border-gray-200/60 p-5 sm:p-6 flex flex-col justify-between min-h-[125px] transition-all duration-200 group hover:shadow-2xl"
      style={{
        boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.10)`,
        border: '1.5px solid rgba(200,200,200,0.16)',
        background: 'rgba(255,255,255,0.80)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 line-clamp-1">{title}</h3>
          <div className="flex items-end gap-2">
            <span
              className="text-3xl font-extrabold text-gray-900 drop-shadow-sm"
              style={{
                letterSpacing: '-0.02em',
                textShadow: `0 2px 12px ${accent}22`,
              }}
            >
              {displayValue}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 font-medium line-clamp-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex items-center justify-center rounded-full shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`,
              boxShadow: `0 4px 16px 0 ${accent}22`,
              width: 48, height: 48, minWidth: 48, minHeight: 48,
              marginLeft: 8,
            }}
          >
            <span className="text-[var(--primary-color)] text-2xl flex items-center">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
