// src/utils/customerAnalytics.ts
import { supabase } from '@/integrations/supabase/client';

export interface CustomerBehavior {
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  favoriteItems: Array<{item: string; count: number}>;
  orderFrequency: number;
}

export const analyzeCustomerBehavior = async (businessId: string) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .not('customer_name', 'eq', '')
    .not('customer_name', 'ilike', '%guest%')
    .not('customer_name', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  const customersMap = new Map<string, any[]>();
  
  orders.forEach(order => {
    if (!order.customer_name) return;
    
    const customerName = order.customer_name.trim();
    if (!customersMap.has(customerName)) {
      customersMap.set(customerName, []);
    }
    customersMap.get(customerName)?.push(order);
  });

  const customerBehaviors: CustomerBehavior[] = [];
  
  customersMap.forEach((customerOrders, customerName) => {
    if (customerOrders.length === 0) return;

    const sortedOrders = [...customerOrders].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstOrder = sortedOrders[0];
    const lastOrder = sortedOrders[sortedOrders.length - 1];
    
    const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const averageOrderValue = totalSpent / customerOrders.length;
    
    let orderFrequency = 0;
    if (customerOrders.length > 1) {
      const firstDate = new Date(firstOrder.created_at);
      const lastDate = new Date(lastOrder.created_at);
      const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      orderFrequency = daysBetween / (customerOrders.length - 1);
    }

    const itemCounts = new Map<string, number>();
    customerOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemName = item.name || item.item_name;
          if (itemName) {
            itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + 1);
          }
        });
      }
    });

    const favoriteItems = Array.from(itemCounts.entries())
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    customerBehaviors.push({
      customerName,
      totalOrders: customerOrders.length,
      totalSpent,
      averageOrderValue,
      firstOrderDate: firstOrder.created_at,
      lastOrderDate: lastOrder.created_at,
      favoriteItems,
      orderFrequency: Math.round(orderFrequency * 10) / 10
    });
  });

  return customerBehaviors.sort((a, b) => b.totalSpent - a.totalSpent);
};