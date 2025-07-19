import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import useAppStore from '@/lib/zustand/appStateStore';

interface SalesData {
  date: string;
  value: number;
}

interface ForecastData {
  date: string;
  actual?: number;
  forecast: number;
  lower?: number;
  upper?: number;
}

const SalesForecasting = () => {
  const [historicalData, setHistoricalData] = useState<SalesData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forecastPeriod, setForecastPeriod] = useState('30');
  const [forecastType, setForecastType] = useState('revenue');
  const [activeTab, setActiveTab] = useState('daily');
  const { session } = useAuthContext();
  const { toast } = useToast();
  const {userData} = useAppStore();

  useEffect(() => {
    fetchHistoricalData();
  }, [forecastType, activeTab]);

  const fetchHistoricalData = async () => {
    setIsLoading(true);
    try {
      // Get the business ID (admin's user_id)
      let businessId = userData?.business_id; // Default to user's ID (for admin)
      
      // If user is staff, use their business_id (which points to their admin)
      if (userData?.role === 'staff' && userData?.business_id) {
        businessId = userData.business_id;
      }
      
      if (!businessId) {
        throw new Error('User ID not available. Please log in again.');
      }

      // Fetch orders for this business
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        setHistoricalData([]);
        setForecastData([]);
        setIsLoading(false);
        return;
      }

      // If we need order count instead of revenue
      if (forecastType === 'orders') {
        const aggregatedData = aggregateOrdersByDate(orders, activeTab);
        setHistoricalData(aggregatedData);
        generateForecast(aggregatedData);
      } else {
        // For revenue forecasting
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('order_id, total_price')
          .in('order_id', orders.map(order => order.id));

        if (itemsError) throw itemsError;

        // Create a map of order dates and total amounts
        const orderMap = new Map();
        orders.forEach(order => {
          orderMap.set(order.id, {
            date: new Date(order.created_at),
            amount: order.total_amount || 0
          });
        });

        // Aggregate data by date
        const aggregatedData = aggregateRevenueByDate(orderMap, activeTab);
        setHistoricalData(aggregatedData);
        generateForecast(aggregatedData);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales data for forecasting',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const aggregateOrdersByDate = (orders: any[], timeframe: string) => {
    const dateFormat = new Map<string, number>();
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      let dateKey: string;
      
      if (timeframe === 'daily') {
        dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeframe === 'weekly') {
        // Get the Monday of the week
        const day = orderDate.getDay();
        const diff = orderDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        const monday = new Date(orderDate);
        monday.setDate(diff);
        dateKey = monday.toISOString().split('T')[0];
      } else { // monthly
        dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (dateFormat.has(dateKey)) {
        dateFormat.set(dateKey, dateFormat.get(dateKey)! + 1);
      } else {
        dateFormat.set(dateKey, 1);
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dateFormat.entries())
      .map(([date, count]) => ({ date, value: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const aggregateRevenueByDate = (orderMap: Map<string, any>, timeframe: string) => {
    const dateFormat = new Map<string, number>();
    
    for (const [_, orderData] of orderMap.entries()) {
      const orderDate = orderData.date;
      const amount = orderData.amount;
      let dateKey: string;
      
      if (timeframe === 'daily') {
        dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeframe === 'weekly') {
        // Get the Monday of the week
        const day = orderDate.getDay();
        const diff = orderDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        const monday = new Date(orderDate);
        monday.setDate(diff);
        dateKey = monday.toISOString().split('T')[0];
      } else { // monthly
        dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (dateFormat.has(dateKey)) {
        dateFormat.set(dateKey, dateFormat.get(dateKey)! + amount);
      } else {
        dateFormat.set(dateKey, amount);
      }
    }
    
    // Convert to array and sort by date
    return Array.from(dateFormat.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const generateForecast = (data: SalesData[]) => {
    if (data.length < 5) {
      // Not enough data for forecasting
      setForecastData([]);
      return;
    }

    // Simple moving average forecasting
    const forecastDays = parseInt(forecastPeriod);
    const windowSize = Math.min(7, Math.floor(data.length / 2)); // Use a 7-day window or half the data points
    
    // Calculate the moving average of the last windowSize points
    const recentValues = data.slice(-windowSize).map(d => d.value);
    const avgValue = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Calculate trend
    const trend = calculateTrend(data);
    
    // Generate forecast dates
    const lastDate = new Date(data[data.length - 1].date);
    const forecast: ForecastData[] = [];
    
    // Add some historical data for context
    const historyToShow = Math.min(data.length, 14);
    for (let i = data.length - historyToShow; i < data.length; i++) {
      forecast.push({
        date: data[i].date,
        actual: data[i].value,
        forecast: data[i].value,
      });
    }
    
    // Generate future dates and forecast values
    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      
      if (activeTab === 'daily') {
        forecastDate.setDate(forecastDate.getDate() + i);
      } else if (activeTab === 'weekly') {
        forecastDate.setDate(forecastDate.getDate() + (i * 7));
      } else { // monthly
        forecastDate.setMonth(forecastDate.getMonth() + i);
      }
      
      // Apply trend to the average
      const forecastValue = Math.max(0, avgValue + (trend * i));
      
      // Calculate confidence interval (simple approach)
      const volatility = calculateVolatility(data);
      const confidenceFactor = 1.96; // ~95% confidence interval
      const interval = volatility * confidenceFactor * Math.sqrt(i);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: parseFloat(forecastValue.toFixed(2)),
        lower: parseFloat((forecastValue - interval).toFixed(2)),
        upper: parseFloat((forecastValue + interval).toFixed(2))
      });
    }
    
    setForecastData(forecast);
  };

  const calculateTrend = (data: SalesData[]): number => {
    if (data.length < 2) return 0;
    
    // Simple linear regression to calculate trend
    const n = data.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    const values = data.map(d => d.value);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + (x * values[i]), 0);
    const sumXX = indices.reduce((sum, x) => sum + (x * x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  };

  const calculateVolatility = (data: SalesData[]): number => {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (activeTab === 'daily') {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    } else if (activeTab === 'weekly') {
      return `Week of ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)}`;
    } else { // monthly
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    }
  };

  const formatTooltipValue = (value: number) => {
    if (forecastType === 'revenue') {
      return `₹${value.toFixed(2)}`;
    }
    return value.toFixed(0);
  };

  const getYAxisLabel = () => {
    return forecastType === 'revenue' ? 'Revenue (₹)' : 'Number of Orders';
  };

  const handleRefresh = () => {
    fetchHistoricalData();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Sales Forecast</CardTitle>
            <CardDescription>
              Predicted {forecastType === 'revenue' ? 'revenue' : 'order count'} for the next {forecastPeriod} days
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Select value={forecastType} onValueChange={setForecastType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Forecast Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Order Count</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Forecast Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
              Refresh
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
          </div>
        ) : historicalData.length < 5 ? (
          <div className="h-80 flex items-center justify-center text-center">
            <div>
              <p className="text-lg font-medium text-gray-600">Not enough historical data for forecasting</p>
              <p className="text-sm text-gray-500 mt-2">At least 5 data points are required to generate a forecast</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecastData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ 
                    value: getYAxisLabel(), 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => formatTooltipValue(value)}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                {forecastData.some(d => d.actual !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#0891b2" 
                    strokeWidth={2} 
                    dot={{ r: 3 }}
                    name="Actual"
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  strokeDasharray={forecastData.findIndex(d => d.actual === undefined) > -1 ? "0" : "5 5"}
                  dot={{ r: 3 }}
                  name="Forecast"
                />
                {forecastData.some(d => d.lower !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="lower" 
                    stroke="#d1d5db" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Lower Bound"
                  />
                )}
                {forecastData.some(d => d.upper !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="upper" 
                    stroke="#d1d5db" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Upper Bound"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-500">
          <p>
            This forecast uses historical sales data and time series analysis to predict future {forecastType === 'revenue' ? 'revenue' : 'order volume'}.
            The shaded area represents the 95% confidence interval.
          </p>
          <p className="mt-1">
            Forecasts are more accurate for shorter time periods and when more historical data is available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesForecasting;
