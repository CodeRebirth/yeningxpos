import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function TypographyH1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("scroll-m-20 text-4xl font-bold tracking-tight font-heading", className)}>
      {children}
    </h1>
  );
}

export function TypographyH2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("scroll-m-20 text-3xl font-semibold tracking-tight font-heading", className)}>
      {children}
    </h2>
  );
}

export function TypographyH3({ children, className }: TypographyProps) {
  return (
    <h3 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight font-heading", className)}>
      {children}
    </h3>
  );
}

export function TypographyH4({ children, className }: TypographyProps) {
  return (
    <h4 className={cn("scroll-m-20 text-xl font-semibold tracking-tight font-heading", className)}>
      {children}
    </h4>
  );
}

export function TypographyP({ children, className }: TypographyProps) {
  return (
    <p className={cn("leading-7", className)}>
      {children}
    </p>
  );
}

export function TypographyLead({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-xl text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function TypographyLarge({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-lg font-semibold", className)}>
      {children}
    </div>
  );
}

export function TypographySmall({ children, className }: TypographyProps) {
  return (
    <small className={cn("text-sm font-medium leading-none", className)}>
      {children}
    </small>
  );
}

export function TypographyMuted({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// Special components for data and analytics
export function DataValue({ children, className }: TypographyProps) {
  return (
    <span className={cn("font-numeric font-semibold", className)}>
      {children}
    </span>
  );
}

export function StatValue({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-3xl font-bold font-numeric tracking-tight", className)}>
      {children}
    </div>
  );
}

export function StatLabel({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-sm font-medium text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function StatChange({ 
  children, 
  className,
  positive = false,
  negative = false
}: TypographyProps & { positive?: boolean; negative?: boolean }) {
  return (
    <div className={cn(
      "text-sm font-numeric font-medium", 
      {
        "text-green-600": positive,
        "text-red-600": negative
      },
      className
    )}>
      {children}
    </div>
  );
}

export function ForecastLabel({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-sm font-medium text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function ForecastValue({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-lg font-bold font-numeric", className)}>
      {children}
    </div>
  );
}
