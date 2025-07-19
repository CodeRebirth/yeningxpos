import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import StatCard from '@/components/StatCard';
import TabButton from '@/components/TabButton';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuthContext } from '@/context/AuthContext';
import SalesForecasting from '@/components/dashboard/SalesForecasting';
import CustomerInsights from '@/components/dashboard/CustomerInsights';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import useAppStore from '@/lib/zustand/appStateStore';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('salesOverview');
  const [timeRange, setTimeRange] = useState('week');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [popularCombinations, setPopularCombinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [stats, setStats] = useState({
    totalSales: 0,
    averageOrder: 0,
    totalOrders: 0,
    totalCategories: 0
  });
  const { toast } = useToast();
  const { session, loading } = useAuthContext(); // Get the current user to access business_id
  const {userData} = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
      if (!session) {
        // If authenticated, redirect to Dashboard
       navigate('/login');
      }
  }, []);

  // Get primary color from CSS variables for charts
  const getPrimaryColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#0891b2';
  };
  
  // Get a slightly modified version of primary color for variations
  const getColorVariation = (index: number) => {
    const baseColor = getPrimaryColor();
    // Create variations based on the index
    if (index === 0) return baseColor;
    
    // Convert hex to HSL for easier manipulation
    const r = parseInt(baseColor.slice(1, 3), 16) / 255;
    const g = parseInt(baseColor.slice(3, 5), 16) / 255;
    const b = parseInt(baseColor.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    // Modify hue based on index
    h = (h + 0.1 * index) % 1;
    
    // Convert back to RGB
    let r1, g1, b1;
    if (s === 0) {
      r1 = g1 = b1 = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r1 = hue2rgb(p, q, h + 1/3);
      g1 = hue2rgb(p, q, h);
      b1 = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert to hex
    return `#${Math.round(r1 * 255).toString(16).padStart(2, '0')}${Math.round(g1 * 255).toString(16).padStart(2, '0')}${Math.round(b1 * 255).toString(16).padStart(2, '0')}`;
  };
  
  const chartColors = {
    primary: getPrimaryColor(),
    sales: getPrimaryColor(),
    pizzas: getColorVariation(1),
    salads: getColorVariation(2),
    mainDishes: getColorVariation(3),
    appetizers: getColorVariation(4),
    burgers: getColorVariation(5),
    beverages: getColorVariation(6),
    sides: getColorVariation(7)
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, selectedDate, selectedWeek]);

  // Check if two dates are the same day (assuming both are already in the same timezone)
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };
  
  // Get the start and end dates of a week containing the given date (Monday to Sunday)
  const getWeekRange = (date: Date): { start: Date, end: Date } => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff); // Start of week (Monday)
    start.setHours(0, 0, 0, 0); // Set to beginning of the day
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // End of week (Sunday)
    end.setHours(23, 59, 59, 999); // Set to end of the day
    
    return { start, end };
  };
  
  // Check if a date falls within the week containing the reference date
  const isInSameWeek = (date: Date, referenceDate: Date): boolean => {
    const { start, end } = getWeekRange(referenceDate);
    return date >= start && date <= end;
  };

  

  // Function to fetch and analyze popular order combinations
  const fetchPopularCombinations = async (businessId: string) => {
    try {
      // Fetch all orders for this business
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('business_id', businessId);
        
      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];
      
      // Get all order items for these orders
      const orderIds = orders.map(order => order.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id, product_name')
        .in('order_id', orderIds);
        
      if (itemsError) throw itemsError;
      if (!orderItems || orderItems.length === 0) return [];
      
      // Group items by order
      const orderBaskets: Record<string, Set<string>> = {};
      orderItems.forEach(item => {
        if (!orderBaskets[item.order_id]) {
          orderBaskets[item.order_id] = new Set();
        }
        orderBaskets[item.order_id].add(item.product_id);
      });
      
      // Create a map of product names by ID
      const productNames: Record<string, string> = {};
      orderItems.forEach(item => {
        productNames[item.product_id] = item.product_name;
      });
      
      // Count co-occurrences of products
      const combinations: Record<string, { count: number, items: string[] }> = {};
      
      Object.values(orderBaskets).forEach(basket => {
        const products = Array.from(basket);
        
        // Only consider baskets with at least 2 items
        if (products.length < 2) return;
        
        // Generate all pairs of products
        for (let i = 0; i < products.length; i++) {
          for (let j = i + 1; j < products.length; j++) {
            const pair = [products[i], products[j]].sort().join('_');
            
            if (!combinations[pair]) {
              combinations[pair] = { 
                count: 0, 
                items: [products[i], products[j]] 
              };
            }
            
            combinations[pair].count += 1;
          }
        }
      });
      
      // Convert to array and sort by count
      const sortedCombinations = Object.values(combinations)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5 combinations
        .map(combo => ({
          items: combo.items.map(id => productNames[id] || 'Unknown Product'),
          count: combo.count
        }));
        
      return sortedCombinations;
    } catch (error) {
      console.error('Error fetching popular combinations:', error);
      return [];
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get the business ID for filtering
      let businessId = userData?.business_id; 
      
      // Fetch orders for sales data, filtered by business_id
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (orders) {
        // Calculate stats
        const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const totalOrders = orders.length;
        const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

        setStats(prev => ({
          ...prev,
          totalSales,
          averageOrder,
          totalOrders
        }));

        // Format sales data by date
        const dateFormat: Record<string, number> = {};

        // Filter orders based on time range
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);

          if (timeRange === 'day') {
            // Use selected date for day view
            return isSameDay(orderDate, selectedDate);
          } else if (timeRange === 'week') {
            // Use selected week
            return isInSameWeek(orderDate, selectedWeek);
          } else if (timeRange === 'month') {
            // Current year only
            return orderDate.getFullYear() === new Date().getFullYear();
          }
          return true;
        });

        // Group by date
        filteredOrders.forEach(order => {
          const date = new Date(order.created_at);
          let dateStr;

          if (timeRange === 'day') {
            // Format by hour
            dateStr = date.getHours() + ':00';
          } else if (timeRange === 'week') {
            // Format by day of week - Monday first, then Sunday last
            // Get the day of week (0 = Sunday, 1 = Monday, etc.)
            const dayOfWeek = date.getDay();
            // Rearrange days to have Monday first and Sunday last
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            // Convert from JavaScript day (0=Sun, 1=Mon) to our array (0=Mon, 6=Sun)
            const adjustedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            dateStr = days[adjustedIndex];
          } else {
            // Format by month for year view
            const options: Intl.DateTimeFormatOptions = { month: 'short' };
            dateStr = new Intl.DateTimeFormat('en-US', options).format(date);
          }

          if (dateFormat[dateStr]) {
            dateFormat[dateStr] += order.total_amount || 0;
          } else {
            dateFormat[dateStr] = order.total_amount || 0;
          }
        });

        // Convert to array format for charts and ensure consistent order
        let formattedSalesData = [];

        if (timeRange === 'day') {
          // For day view, ensure all hours are represented (0-23)
          const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
          formattedSalesData = hours.map(hour => ({
            name: hour,
            value: dateFormat[hour] || 0
          }));
        } else if (timeRange === 'week') {
          // For week view, ensure all days are represented in correct order (Monday to Sunday)
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          formattedSalesData = days.map(day => ({
            name: day,
            value: dateFormat[day] || 0
          }));
        } else {
          // For month view, ensure all months are represented in correct order
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          formattedSalesData = months.map(month => ({
            name: month,
            value: dateFormat[month] || 0
          }));
        }

        // If no data is available, keep empty data array
        // No sample data generation

        setSalesData(formattedSalesData);
      }

      // Fetch order items for top selling products, filtered by business_id
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('business_id', businessId);

        // console.log(orderItems,"orderItems");
        
      // console.log(`Fetching top selling items for business ID: ${businessId}`);

      if (itemsError) throw itemsError;

      if (orderItems) {
        // Group by product and count quantity
        const productSales: Record<string, { name: string, units: number, price: number }> = {};

        orderItems.forEach(item => {
          const productId = item.product_id || '';
          const productName = item.product_name || 'Unknown Product';

          if (productSales[productId]) {
            productSales[productId].units += item.quantity || 0;
            productSales[productId].price += item.total_price || 0;
          } else {
            productSales[productId] = {
              name: productName,
              units: item.quantity || 0,
              price: item.total_price || 0
            };
          }
        });

        // Convert to array and sort by units sold
        const sortedTopItems = Object.entries(productSales)
          .map(([id, data]) => ({
            id,
            name: data.name,
            units: data.units,
            price: `₹${data.price.toFixed(2)}`
          }))
          .sort((a, b) => b.units - a.units)
          .slice(0, 5); // Get top 5


          // console.log(productSales);

        // If no top items data is available, use sample data
        if (sortedTopItems.length === 0) {
          // setTopItems(generateSampleTopItems());
        } else {
          setTopItems(sortedTopItems);
        }
        
        // Fetch popular combinations
        const combinationsData = await fetchPopularCombinations(businessId);
        setPopularCombinations(combinationsData);
      }

      // Fetch categories for this business
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId);

      if (categoriesError) throw categoriesError;

      if (categories) {
        setStats(prev => ({
          ...prev,
          totalCategories: categories.length
        }));

        // Get sales by category
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, category');

        if (productsError) throw productsError;

        if (products) {
          // Map product IDs to category IDs
          const productCategories: Record<string, string> = {};
          products.forEach(product => {
            productCategories[product.id] = product.category;
          });

          // Group order items by category
          const categorySales: Record<string, { name: string, value: number, color: string }> = {};

          // Initialize with all categories
          categories.forEach((category, index) => {
            const colorKey = Object.keys(chartColors)[index % Object.keys(chartColors).length];
            categorySales[category.id] = {
              name: category.name,
              value: 0,
              color: chartColors[colorKey as keyof typeof chartColors]
            };
          });

          // Sum sales by category
          orderItems?.forEach(item => {
            const productId = item.product_id;
            if (productId) {
              const categoryId = productCategories[productId];
              if (categoryId && categorySales[categoryId]) {
                categorySales[categoryId].value += item.total_price || 0;
              }
            }
          });

          // Convert to array format for charts
          const formattedCategoryData = Object.values(categorySales);

          // If no category data is available, use sample data
          if (formattedCategoryData.length === 0 || formattedCategoryData.every(item => item.value === 0)) {
            // setCategoryData(generateSampleCategoryData());
          } else {
            setCategoryData(formattedCategoryData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      
      // Check if this is the first visit to the dashboard
      if (!localStorage.getItem('dashboard_visited')) {
        // Check if there's no data and show guidance toast for new users
        if (stats.totalOrders === 0 && stats.totalCategories === 0) {
          toast({
            title: 'Welcome to your new dashboard!',
            description: 'To get started, please set up your products and categories in the Inventory section.',
            duration: 6000
          });
        } else if (stats.totalCategories > 0 && topItems.length === 0) {
          toast({
            title: 'Add some products',
            description: 'You have categories set up, but no products yet. Add products in the Inventory section to see sales data.',
            duration: 5000
          });
        }
        
        // Mark dashboard as visited regardless of whether we showed a toast
        localStorage.setItem('dashboard_visited', 'true');
      }
    }
  };

  // Custom tooltip formatter to display currency
  const salesFormatter = (value: number) => {
    return `₹${value.toFixed(2)}`;
  };

  // Utility to detect mobile view
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Abbreviate label for mobile
  const abbreviateLabel = (label: string) => {
    if (timeRange === 'month') return label.slice(0, 3); // "January" -> "Jan"
    if (timeRange === 'week') return label.slice(0, 3); // "Monday" -> "Mon"
    if (timeRange === 'day') return label.replace(':00', ''); // "12:00" -> "12"
    return label;
  };

  const primaryColor = getPrimaryColor();


  if(loading){
    return <Loader2 className="animate-spin" />;
  }

  return (
<div
  className="container mx-auto py-6 space-y-6 h-[90vh] md:h-auto"
  style={{
    background: `linear-gradient(135deg, ${primaryColor}0 0%, #fff 80%, transparent 100%)`
  }}
>
<div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-viilare-500">Welcome back, Admin User! Here's what's happening with your business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Sales"
          value={`₹${stats.totalSales.toFixed(2)}`}
          subtitle={`From ${stats.totalOrders} orders`}
        />
        <StatCard
          title="Average Order"
          value={`₹${stats.averageOrder.toFixed(2)}`}
          subtitle="Per Transaction"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          subtitle="Completed orders"
        />
        <StatCard
          title="Categories"
          value={stats.totalCategories.toString()}
          subtitle="Product Categories"
        />
      </div>

      <div className="flex mb-6 space-x-2 overflow-x-auto pb-2">
        <TabButton
          active={activeTab === 'salesOverview'}
          onClick={() => setActiveTab('salesOverview')}
        >
          Sales Overview
        </TabButton>
        <TabButton
          active={activeTab === 'topItems'}
          onClick={() => setActiveTab('topItems')}
        >
          Top Items
        </TabButton>
        <TabButton
          active={activeTab === 'categories'}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </TabButton>
        <TabButton
          active={activeTab === 'combinations'}
          onClick={() => setActiveTab('combinations')}
        >
          Popular Combinations
        </TabButton>
        <TabButton
          active={activeTab === 'forecast'}
          onClick={() => setActiveTab('forecast')}
        >
          Sales Forecast
        </TabButton>
        <TabButton
          active={activeTab === 'customers'}
          onClick={() => setActiveTab('customers')}
        >
          Customer Insights
        </TabButton>
      </div>

      {activeTab === 'salesOverview' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Sales Trend</h2>
          <p className="text-sm text-gray-500 mb-6">Sales overview for the selected time period</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:space-x-4 sm:gap-0">
              <button
                className={`text-sm px-3 py-1 rounded-full ${timeRange === 'day' ? 'bg-viilare-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setTimeRange('day')}
              >
                Day
              </button>
              <button
                className={`text-sm px-3 py-1 rounded-full ${timeRange === 'week' ? 'bg-viilare-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setTimeRange('week')}
              >
                Week
              </button>
              <button
                className={`text-sm px-3 py-1 rounded-full ${timeRange === 'month' ? 'bg-viilare-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setTimeRange('month')}
              >
                Year
              </button>
            </div>
            
            {timeRange === 'day' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
            
            {timeRange === 'week' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {format(getWeekRange(selectedWeek).start, 'MMM d')} - {format(getWeekRange(selectedWeek).end, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedWeek}
                    onSelect={(date) => date && setSelectedWeek(date)}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="h-80">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
              </div>
            ) : salesData.length === 0 || salesData.every(item => item.value === 0) ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No sales data available for {timeRange === 'day' ? format(selectedDate, 'PPP') : timeRange === 'week' ? 'this week' : 'this year'}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                  barSize={50}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    angle={isMobile ? -45 : (timeRange === 'month' ? -45 : 0)}
                    textAnchor={isMobile ? 'end' : (timeRange === 'month' ? 'end' : 'middle')}
                    height={isMobile ? 40 : 60}
                    tick={{ fontSize: isMobile ? 9 : 12 }}
                    tickFormatter={isMobile ? abbreviateLabel : undefined}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={salesFormatter}
                    width={50}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Sales']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar
                    dataKey="value"
                    name="Sales"
                    fill={chartColors.primary}
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === 'topItems' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Top Selling Items</h2>
          <p className="text-sm text-gray-500 mb-6">Top {Math.min(5, topItems.length)} best selling items</p>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {topItems.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  No sales data available yet
                </div>
              ) : (
                topItems.map((item, index) => (
                  <div
  key={item.id}
  className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl border border-gray-100 bg-white/80 shadow-sm hover:shadow-md transition-all gap-3"
>
  <div className="flex items-center gap-3 min-w-0">
    <span className="inline-block min-w-[28px] h-7 px-2 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-bold flex items-center justify-center mr-1">
      {index + 1}
    </span>
    {item.image && (
      <img
        src={item.image}
        alt={item.name}
        className="w-10 h-10 object-cover rounded-lg border border-gray-100 bg-gray-50"
        loading="lazy"
      />
    )}
    <span className="font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[180px]">{item.name}</span>
  </div>
  <div className="flex flex-col items-end min-w-[80px]">
    <span className="font-bold text-base text-gray-800">₹{item.price}</span>
    <span className="text-xs text-gray-400 font-medium">{item.units} sold</span>
  </div>
</div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Category Performance</h2>
          <p className="text-sm text-gray-500 mb-6">Sales by Category</p>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                {categoryData.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No category data available yet
                  </div>
                ) : (
                  categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-6 h-6 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span>{category.name}</span>
                      </div>
                      <div className="font-semibold">₹{category.value.toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="h-72 flex items-center justify-center">
                {categoryData.length === 0 ? (
                  <div className="text-gray-400">No data to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {categoryData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getColorVariation(index)} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={getColorVariation(index)} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={80}
                        paddingAngle={4}
                        cornerRadius={3}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                        animationEasing="ease-out"
                        label={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#colorGradient-${index})`}
                            stroke={getColorVariation(index)}
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']} 
                        contentStyle={{
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{
                          paddingTop: '15px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'combinations' && (
        <div className="bg-white p-6 rounded-lg shadow-sm md:h-[50vh] md:overflow-y-auto">
          <h2 className="text-xl font-semibold mb-1">Popular Combinations</h2>
          <p className="text-sm text-gray-500 mb-6">Items frequently purchased together</p>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viilare-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {popularCombinations.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  Not enough order data to determine popular combinations
                </div>
              ) : (
                popularCombinations.map((combo, index) => (
                  <div
  key={index}
  className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 mb-2 rounded-xl border border-gray-100 bg-white/80 shadow-sm hover:shadow-md transition-all gap-2 sm:gap-3"
>
  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
    <span className="inline-block min-w-[24px] h-6 px-2 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-bold flex items-center justify-center mr-1">
      {index + 1}
    </span>
    <div className="min-w-0">
      <div className="font-semibold text-gray-900 whitespace-normal break-words leading-snug">{combo.items.join(' + ')}</div>
      <div className="text-xs text-gray-400 font-medium whitespace-normal break-words">Purchased together {combo.count} times</div>
    </div>
  </div>
  <div className="flex flex-col items-end min-w-0 sm:min-w-[120px] mt-2 sm:mt-0">
    <span className="text-xs text-gray-500">Combination strength</span>
    <div className="w-full sm:w-24 bg-gray-200 rounded-full h-2.5 mt-1">
      <div
        className="bg-[var(--primary-color)] h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, (combo.count / popularCombinations[0].count) * 100)}%` }}
      ></div>
    </div>
  </div>
</div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'forecast' && (
        <SalesForecasting />
      )}
      
      {activeTab === 'customers' && (
        <CustomerInsights />
      )}
    </div>
  );
};

export default Dashboard;
