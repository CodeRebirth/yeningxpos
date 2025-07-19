import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CustomerBehavior } from '@/utils/customerAnalytics';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppMarketingProps {
  customers: CustomerBehavior[];
}

export const WhatsAppMarketing: React.FC<WhatsAppMarketingProps> = ({ customers }) => {
  const [activeTab, setActiveTab] = useState('campaign');
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [targetSegment, setTargetSegment] = useState('all');
  const [minSpent, setMinSpent] = useState(0);
  const [minOrders, setMinOrders] = useState(0);
  const [lastOrderDays, setLastOrderDays] = useState(30);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  const handleSendCampaign = async () => {
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
      // This would connect to the WhatsApp Business API
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Campaign created successfully',
        description: `Your WhatsApp campaign "${campaignName}" has been ${isScheduled ? 'scheduled' : 'sent'} to ${filteredCustomers.length} customers.`,
        variant: 'default'
      });
      
      // Reset form
      setCampaignName('');
      setMessageTemplate('');
      setTargetSegment('all');
      setIsScheduled(false);
      setScheduleDate('');
    } catch (error) {
      console.error('Error sending WhatsApp campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send WhatsApp campaign. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewMessage = (customer: CustomerBehavior) => {
    if (!messageTemplate) return '';
    
    return messageTemplate
      .replace('{{customerName}}', customer.customerName)
      .replace('{{totalSpent}}', `$${customer.totalSpent.toFixed(2)}`)
      .replace('{{orderCount}}', customer.totalOrders.toString())
      .replace('{{lastOrderDate}}', new Date(customer.lastOrderDate).toLocaleDateString());
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>WhatsApp Marketing Automation</CardTitle>
        <CardDescription>Create and send targeted WhatsApp marketing campaigns to your customers</CardDescription>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaign">Create Campaign</TabsTrigger>
            <TabsTrigger value="preview">Preview ({filteredCustomers.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        <TabsContent value="campaign" className="space-y-4">
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
              <Select value={targetSegment} onValueChange={setTargetSegment}>
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
          </div>
        </TabsContent>
        
        <TabsContent value="preview">
          <div className="space-y-4">
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
                    : 'Immediate'}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Message Preview</h3>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, 5).map((customer, index) => (
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
                
                {filteredCustomers.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    + {filteredCustomers.length - 5} more customers
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab('campaign')}>
          {activeTab === 'preview' ? 'Back to Campaign' : 'Reset'}
        </Button>
        <Button 
          onClick={handleSendCampaign} 
          disabled={isLoading || !campaignName || !messageTemplate || filteredCustomers.length === 0}
        >
          {isLoading ? 'Processing...' : isScheduled ? 'Schedule Campaign' : 'Send Campaign'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppMarketing;
