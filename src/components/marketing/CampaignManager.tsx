import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CustomerBehavior } from '@/utils/customerAnalytics';
import { useToast } from '@/hooks/use-toast';
import { 
  Campaign, 
  createCampaign, 
  getCampaigns, 
  updateCampaign, 
  deleteCampaign, 
  sendCampaign,
  getCampaignStats
} from '@/utils/marketingApi';
import { useAuthContext } from '@/context/AuthContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import useAppStore from '@/lib/zustand/appStateStore';

interface CampaignManagerProps {
  customers: CustomerBehavior[];
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ customers }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const { toast } = useToast();
  const { session } = useAuthContext();
  const {userData} = useAppStore();

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [targetSegment, setTargetSegment] = useState<'all' | 'highValue' | 'frequent' | 'inactive'>('all');
  const [minSpent, setMinSpent] = useState(0);
  const [minOrders, setMinOrders] = useState(0);
  const [lastOrderDays, setLastOrderDays] = useState(30);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    if (userData) {
      fetchCampaigns();
    }
  }, [userData]);

  const fetchCampaigns = async () => {
    if (!userData) return;
    
    setIsLoading(true);
    try {
      const data = await getCampaigns(userData.userId);
      setCampaigns(data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on targeting criteria
  const filteredCustomers = customers.filter(customer => {
    if (targetSegment === 'all') return true;
    
    if (targetSegment === 'highValue' && customer.totalSpent >= minSpent) return true;
    
    if (targetSegment === 'frequent' && customer.totalOrders >= minOrders) return true;
    
    if (targetSegment === 'inactive') {
      const lastOrderDate = new Date(customer.lastOrderDate);
      const daysSinceLastOrder = Math.floor((new Date().getTime() - lastOrderDate.getTime()) / (1000 * 3600 * 24));
      return daysSinceLastOrder >= lastOrderDays;
    }
    
    return false;
  });

  // Message templates
  const templates = [
    {
      id: 'discount',
      name: 'Discount Offer',
      content: 'Hello {{customerName}}, we miss you at VIILARE! Enjoy 10% off your next order with code: WELCOME10. Valid for 7 days.'
    },
    {
      id: 'newProduct',
      name: 'New Product Announcement',
      content: 'Hello {{customerName}}, check out our latest additions! We\'ve just added new items we think you\'ll love based on your previous orders.'
    },
    {
      id: 'feedback',
      name: 'Feedback Request',
      content: 'Hello {{customerName}}, thank you for your recent purchase! We\'d love to hear your thoughts. Reply with your feedback and get 5% off your next order.'
    },
    {
      id: 'custom',
      name: 'Custom Message',
      content: ''
    }
  ];

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessageTemplate(template.content);
    }
  };

  const resetForm = () => {
    setCampaignName('');
    setMessageTemplate('');
    setTargetSegment('all');
    setMinSpent(0);
    setMinOrders(0);
    setLastOrderDays(30);
    setIsScheduled(false);
    setScheduleDate('');
  };

  const handleCreateCampaign = async () => {
    if (!userData) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create campaigns',
        variant: 'destructive'
      });
      return;
    }

    if (!campaignName) {
      toast({
        title: 'Campaign name required',
        description: 'Please enter a name for your campaign',
        variant: 'destructive'
      });
      return;
    }

    if (!messageTemplate) {
      toast({
        title: 'Message required',
        description: 'Please enter a message or select a template',
        variant: 'destructive'
      });
      return;
    }

    if (filteredCustomers.length === 0) {
      toast({
        title: 'No customers selected',
        description: 'Your current filters don\'t match any customers',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const segmentCriteria: any = {};
      
      if (targetSegment === 'highValue') {
        segmentCriteria.min_spent = minSpent;
      } else if (targetSegment === 'frequent') {
        segmentCriteria.min_orders = minOrders;
      } else if (targetSegment === 'inactive') {
        segmentCriteria.inactive_days = lastOrderDays;
      }
      
      const newCampaign: Omit<Campaign, 'id' | 'created_at'> = {
        business_id: userData.business_id,
        name: campaignName,
        message_template: messageTemplate,
        target_segment: targetSegment,
        segment_criteria: segmentCriteria,
        status: isScheduled ? 'scheduled' : 'draft',
        scheduled_date: isScheduled ? scheduleDate : undefined,
        recipient_count: filteredCustomers.length
      };
      
      await createCampaign(newCampaign);
      
      toast({
        title: 'Campaign created',
        description: `Your campaign "${campaignName}" has been created successfully`,
        variant: 'default'
      });
      
      resetForm();
      fetchCampaigns();
      setActiveTab('manage');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    
    setIsLoading(true);
    try {
      await deleteCampaign(selectedCampaign.id!);
      
      toast({
        title: 'Campaign deleted',
        description: `Campaign "${selectedCampaign.name}" has been deleted`,
        variant: 'default'
      });
      
      fetchCampaigns();
      setShowDeleteDialog(false);
      setSelectedCampaign(null);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) return;
    
    setIsSending(true);
    try {
      const result = await sendCampaign(selectedCampaign.id!);
      
      toast({
        title: 'Campaign sent',
        description: result.message,
        variant: 'default'
      });
      
      fetchCampaigns();
      setShowSendDialog(false);
      setSelectedCampaign(null);
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send campaign',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleViewStats = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsLoading(true);
    
    try {
      const stats = await getCampaignStats(campaign.id!);
      setCampaignStats(stats);
      setActiveTab('analytics');
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign statistics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewMessage = (customer: CustomerBehavior) => {
    if (!messageTemplate) return '';
    
    return messageTemplate
      .replace(/\{\{customerName\}\}/g, customer.customerName)
      .replace(/\{\{totalSpent\}\}/g, `$${customer.totalSpent.toFixed(2)}`)
      .replace(/\{\{orderCount\}\}/g, customer.totalOrders.toString())
      .replace(/\{\{lastOrderDate\}\}/g, new Date(customer.lastOrderDate).toLocaleDateString());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Sent</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pieChartColors = ['#0891b2', '#22c55e', '#f97316', '#ef4444'];

  const renderAnalyticsData = () => {
    if (!campaignStats || !selectedCampaign) return null;
    
    const deliveryData = [
      { name: 'Delivered', value: campaignStats.delivered },
      { name: 'Failed', value: campaignStats.sent - campaignStats.delivered }
    ];
    
    const engagementData = [
      { name: 'Read', value: campaignStats.read },
      { name: 'Not Read', value: campaignStats.delivered - campaignStats.read },
      { name: 'Responded', value: campaignStats.responded }
    ];
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{selectedCampaign.name}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCampaign.status === 'sent' || selectedCampaign.status === 'completed' 
                ? `Sent on ${new Date(selectedCampaign.sent_date!).toLocaleDateString()}`
                : `Created on ${new Date(selectedCampaign.created_at!).toLocaleDateString()}`
              }
            </p>
          </div>
          <Button variant="outline" onClick={() => setActiveTab('manage')}>
            Back to Campaigns
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaignStats.sent}</div>
              <p className="text-sm text-muted-foreground">Total Messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaignStats.delivered}</div>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaignStats.read}</div>
              <p className="text-sm text-muted-foreground">Read</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaignStats.responded}</div>
              <p className="text-sm text-muted-foreground">Responses</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {deliveryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={engagementData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0891b2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>WhatsApp Campaign Manager</CardTitle>
        <CardDescription>Create, manage, and analyze your WhatsApp marketing campaigns</CardDescription>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Campaign</TabsTrigger>
            <TabsTrigger value="manage">Manage Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        <TabsContent value="create" className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input 
                placeholder="Enter campaign name" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message Template</label>
              <Select onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Textarea 
                placeholder="Enter your message. Use {{customerName}} for personalization."
                className="mt-2 h-32"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
              />
              
              <div className="mt-2 text-xs text-muted-foreground">
                Available variables: &#123;&#123;customerName&#125;&#125;, &#123;&#123;totalSpent&#125;&#125;, &#123;&#123;orderCount&#125;&#125;, &#123;&#123;lastOrderDate&#125;&#125;
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Target Audience</label>
              <Select value={targetSegment} onValueChange={(value: any) => setTargetSegment(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers ({customers.length})</SelectItem>
                  <SelectItem value="highValue">High Value Customers</SelectItem>
                  <SelectItem value="frequent">Frequent Customers</SelectItem>
                  <SelectItem value="inactive">Inactive Customers</SelectItem>
                </SelectContent>
              </Select>
              
              {targetSegment === 'highValue' && (
                <div className="mt-2">
                  <label className="text-xs">Minimum Total Spent</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={minSpent}
                    onChange={(e) => setMinSpent(Number(e.target.value))}
                  />
                </div>
              )}
              
              {targetSegment === 'frequent' && (
                <div className="mt-2">
                  <label className="text-xs">Minimum Orders</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={minOrders}
                    onChange={(e) => setMinOrders(Number(e.target.value))}
                  />
                </div>
              )}
              
              {targetSegment === 'inactive' && (
                <div className="mt-2">
                  <label className="text-xs">Days Since Last Order</label>
                  <Input 
                    type="number" 
                    min="1"
                    value={lastOrderDays}
                    onChange={(e) => setLastOrderDays(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="schedule" 
                checked={isScheduled}
                onChange={() => setIsScheduled(!isScheduled)}
              />
              <label htmlFor="schedule" className="text-sm">Schedule for later</label>
            </div>
            
            {isScheduled && (
              <div>
                <label className="text-sm font-medium">Schedule Date & Time</label>
                <Input 
                  type="datetime-local" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
            )}
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Campaign Summary</h3>
              <div className="text-sm">
                <p><span className="font-medium">Name:</span> {campaignName || 'Untitled Campaign'}</p>
                <p><span className="font-medium">Recipients:</span> {filteredCustomers.length} customers</p>
                <p>
                  <span className="font-medium">Targeting:</span> 
                  {targetSegment === 'all' && 'All Customers'}
                  {targetSegment === 'highValue' && `High Value (Min. Spent: $${minSpent})`}
                  {targetSegment === 'frequent' && `Frequent (Min. Orders: ${minOrders})`}
                  {targetSegment === 'inactive' && `Inactive (${lastOrderDays}+ days)`}
                </p>
                <p>
                  <span className="font-medium">Delivery:</span> 
                  {isScheduled 
                    ? `Scheduled for ${new Date(scheduleDate).toLocaleString()}` 
                    : 'Draft (send manually)'}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Message Preview</h3>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, 3).map((customer, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{customer.customerName}</div>
                        <Badge variant="outline" className="text-xs">
                          ${customer.totalSpent.toFixed(2)} · {customer.totalOrders} orders
                        </Badge>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {getPreviewMessage(customer)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers match your current targeting criteria
                  </div>
                )}
                
                {filteredCustomers.length > 3 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    + {filteredCustomers.length - 3} more customers
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="manage">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-viilare-500"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't created any campaigns yet</p>
              <Button onClick={() => setActiveTab('create')}>Create Your First Campaign</Button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="font-medium">Your Campaigns</h3>
                <Button onClick={() => setActiveTab('create')} size="sm">
                  Create New Campaign
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.recipient_count}</TableCell>
                      <TableCell>{new Date(campaign.created_at!).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {campaign.status === 'draft' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setShowSendDialog(true);
                              }}
                            >
                              Send
                            </Button>
                          )}
                          
                          {(campaign.status === 'sent' || campaign.status === 'completed') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewStats(campaign)}
                            >
                              View Stats
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDeleteDialog(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-viilare-500"></div>
            </div>
          ) : campaignStats && selectedCampaign ? (
            renderAnalyticsData()
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Select a campaign to view analytics</p>
              <Button onClick={() => setActiveTab('manage')}>View Campaigns</Button>
            </div>
          )}
        </TabsContent>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {activeTab === 'create' && (
          <>
            <Button variant="outline" onClick={resetForm}>
              Reset Form
            </Button>
            <Button 
              onClick={handleCreateCampaign} 
              disabled={isLoading || !campaignName || !messageTemplate || filteredCustomers.length === 0}
            >
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </>
        )}
      </CardFooter>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the campaign "{selectedCampaign?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCampaign}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Campaign Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to send the campaign "{selectedCampaign?.name}" to {selectedCampaign?.recipient_count} recipients? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendCampaign}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Send Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CampaignManager;
