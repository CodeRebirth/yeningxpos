// src/components/dashboard/CustomerInsights.tsx
import React, { useEffect, useState } from 'react';
import { CustomerBehavior, analyzeCustomerBehavior } from '@/utils/customerAnalytics';
import { useAuthContext } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAppStore from '@/lib/zustand/appStateStore';
// import CampaignManager from '@/components/marketing/CampaignManager';

const CustomerInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerBehavior[]>([]);
  const [activeTab, setActiveTab] = useState('insights');
  const { session } = useAuthContext();
  const {userData} = useAppStore();

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!userData) return;
      
      setLoading(true);
      try {
        const data = await analyzeCustomerBehavior(userData.business_id);
        setCustomerData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [userData]);

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Orders',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      sorter: (a: CustomerBehavior, b: CustomerBehavior) => a.totalOrders - b.totalOrders,
    },
    {
      title: 'Total Spent',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (value: number) => `$${value.toFixed(2)}`,
      sorter: (a: CustomerBehavior, b: CustomerBehavior) => a.totalSpent - b.totalSpent,
    },
    {
      title: 'Avg. Order',
      dataIndex: 'averageOrderValue',
      key: 'averageOrderValue',
      render: (value: number) => `$${value.toFixed(2)}`,
      sorter: (a: CustomerBehavior, b: CustomerBehavior) => a.averageOrderValue - b.averageOrderValue,
    },
    {
      title: 'Last Visit',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: CustomerBehavior, b: CustomerBehavior) => 
        new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime(),
    },
    {
      title: 'Favorite Items',
      dataIndex: 'favoriteItems',
      key: 'favoriteItems',
      render: (items: Array<{item: string, count: number}>) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {items.map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {item.item} ({item.count})
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-viilare-500 mr-2"></div>
          <span>Analyzing customer data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="customer-insights">
      <h2 className="text-2xl font-bold mb-6">Customer Insights</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-1 mb-6">
          <TabsTrigger value="insights">Customer Data</TabsTrigger>
          {/* WhatsApp campaign tab commented out
          <TabsTrigger value="marketing">WhatsApp Campaigns</TabsTrigger>
          */}
        </TabsList>
      
        <TabsContent value="insights">
          {customerData.length > 0 ? (
        <Card>
          <CardContent>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Customer</TableHead>
                  <TableHead className="text-center w-[80px]">Orders</TableHead>
                  <TableHead className="text-right w-[120px]">Total Spent</TableHead>
                  <TableHead className="text-right w-[120px]">Avg. Order</TableHead>
                  <TableHead className="text-center w-[120px]">Last Visit</TableHead>
                  <TableHead className="w-[200px]">Favorite Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerData.map((customer) => (
                  <TableRow key={customer.customerName}>
                    <TableCell><strong>{customer.customerName}</strong></TableCell>
                    <TableCell className="text-center">{customer.totalOrders}</TableCell>
                    <TableCell className="text-right">${customer.totalSpent.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${customer.averageOrderValue.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{new Date(customer.lastOrderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {customer.favoriteItems.map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item.item} ({item.count})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="text-muted-foreground">
              No customer data available yet. Process some orders to see insights.
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>
      
      {/* WhatsApp campaign content section commented out
      <TabsContent value="marketing" className="mt-0">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-viilare-500 mr-2"></div>
              <span>Loading customer data...</span>
            </CardContent>
          </Card>
        ) : customerData.length > 0 ? (
          <CampaignManager customers={customerData} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="text-muted-foreground">
                No customer data available for marketing campaigns. Process some orders first.
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      */}
      </Tabs>
    </div>
  );
};

export default CustomerInsights;