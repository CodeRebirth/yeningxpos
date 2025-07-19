import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatValue, StatLabel, StatChange, ForecastLabel, ForecastValue } from '@/components/ui/typography';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  changePercentage?: number;
  forecastValue?: string | number;
  confidenceLevel?: number;
  timeframe?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ForecastCard({
  title,
  value,
  previousValue,
  changePercentage = 0,
  forecastValue,
  confidenceLevel = 85,
  timeframe = '30 days',
  icon,
  className
}: ForecastCardProps) {
  const isPositive = changePercentage > 0;
  const isNegative = changePercentage < 0;
  const changeAbs = Math.abs(changePercentage);
  
  return (
    <Card className={cn("stat-card overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon || (
          <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <StatValue>
            {value}
          </StatValue>
          
          {(previousValue || changePercentage !== 0) && (
            <div className="flex items-center">
              {isPositive && (
                <ArrowUpIcon className="mr-1 h-4 w-4 text-green-600" />
              )}
              {isNegative && (
                <ArrowDownIcon className="mr-1 h-4 w-4 text-red-600" />
              )}
              <StatChange positive={isPositive} negative={isNegative}>
                {changeAbs.toFixed(1)}% {isPositive ? 'increase' : 'decrease'}
              </StatChange>
              <span className="text-muted-foreground text-xs ml-1">vs. previous</span>
            </div>
          )}
          
          {forecastValue && (
            <div className="pt-3 border-t">
              <ForecastLabel>
                Forecast ({timeframe})
              </ForecastLabel>
              <div className="flex items-center justify-between mt-1">
                <ForecastValue>
                  {forecastValue}
                </ForecastValue>
                <div className="bg-primary/10 text-primary text-xs font-medium rounded-full px-2 py-0.5">
                  {confidenceLevel}% confidence
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastCardSkeleton() {
  return (
    <Card className="stat-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-8 w-28 bg-muted rounded animate-pulse" />
          <div className="flex items-center">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="pt-3 border-t">
            <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
            <div className="flex items-center justify-between mt-1">
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
