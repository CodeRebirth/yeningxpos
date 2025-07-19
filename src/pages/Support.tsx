import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';

// Types for support tickets
interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  user_id: string;
}

// Generate UUID for client-side fallback
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const Support = () => {
  const { toast } = useToast();
  const { session } = useAuthContext();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isViewTicketOpen, setIsViewTicketOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's support tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (!session) return;

      setIsLoading(true);
      setError(null);

      try {
        // console.log('Fetching tickets for user:', user.id);

        // Force type casting to bypass TypeScript errors
        const response = await (supabase as any).from('queries').select('*');
        // console.log('Query response:', response);

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Convert to ticket format
        const ticketsData = (response.data || []).map((item: any) => ({
          id: String(item.id || generateUUID()),
          subject: item.subject || 'No Subject',
          description: item.description || 'No Description',
          status: item.status || 'open',
          created_at: item.created_at || new Date().toISOString(),
          user_id: item.user_id || 'anonymous'
        }));

        // console.log('Processed tickets:', ticketsData);
        setTickets(ticketsData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');

        toast({
          title: 'Error Loading Tickets',
          description: err instanceof Error ? err.message : 'Could not load tickets',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [session, toast]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide both subject and description',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketData = {
        subject: subject.trim(),
        description: description.trim(),
        user_id: session?.user.id || null,
        status: 'open'
      };

      // console.log('Submitting ticket:', ticketData);

      // Force type casting to bypass TypeScript errors
      const response = await (supabase as any).from('queries').insert(ticketData);
      // console.log('Insert response:', response);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Reset form
      setSubject('');
      setDescription('');

      toast({
        title: "Request submitted",
        description: "Your support request has been sent successfully.",
        variant: "default"
      });

      // Refresh page to get updated data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Submission error:', err);

      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsViewTicketOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Closed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 h-[90vh] md:h-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 font-protest">Help & Support</h1>
        <p className="text-gray-500 font-poppins">Get help with your POS system and account</p>
      </div>

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Tickets</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      )}

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="create">Create Ticket</TabsTrigger>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 font-poppins-semibold">Contact Support</h2>

                <form onSubmit={handleSubmitRequest} className="space-y-6 font-poppins">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Issue with payment processing"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      placeholder="Please describe your issue in detail..."
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="bg-viilare-500 hover:bg-viilare-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 font-poppins-semibold">Contact Information</h2>

                <div className="space-y-4 font-poppins">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Email Support</h3>
                    <p className="text-viilare-500 mt-1">support@viilare.com</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Phone Support</h3>
                    <p className="text-viilare-500 mt-1">+1 (800) 123-4567</p>
                    <p className="text-xs text-gray-500">Monday - Friday, 9:00 AM - 5:00 PM EST</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="my-tickets">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 font-poppins-semibold">My Support Tickets</h2>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-viilare-500" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>You haven't submitted any support tickets yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{String(ticket.id).substring(0, 8)}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 font-poppins-semibold">Frequently Asked Questions</h2>

            <Accordion type="single" collapsible className="w-full font-poppins">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I add new menu items?</AccordionTrigger>
                <AccordionContent>
                  To add new menu items, go to the Menu Management section, click on "Add New Item", and fill in the required details such as name, price, category, and description. You can also upload an image for the item.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Can I customize receipt templates?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can customize receipt templates by going to Settings {`>`} Receipts. From there, you can add your business logo, customize the header and footer text, and choose which information to include on receipts.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>How do I process refunds?</AccordionTrigger>
                <AccordionContent>
                  To process a refund, go to the Receipts section, find the transaction you want to refund, click on it to view details, and then click the "Process Refund" button. You can choose to refund the full amount or a partial amount.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Can I add multiple users to my account?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can add multiple users to your account with different permission levels. Go to Settings {`>`} Users {`>`} Add New User, and enter their details. You can assign them roles such as Admin, Manager, or Cashier, each with different access permissions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>How do I track inventory?</AccordionTrigger>
                <AccordionContent>
                  Inventory tracking can be enabled in the Settings {`>`} Inventory section. Once enabled, you can set initial stock levels for each item, and the system will automatically deduct from inventory when items are sold. You can also set up low stock alerts.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Ticket Dialog */}
      <Dialog open={isViewTicketOpen} onOpenChange={setIsViewTicketOpen}>
        <DialogContent className="max-w-md p-0 bg-white">
          <DialogHeader className="p-4 border-b flex justify-between items-center">
            <DialogTitle>Support Ticket</DialogTitle>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                onClick={() => window.print()}
              >
                <Loader2 className="h-4 w-4" />
                Process
              </Button>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 p-1 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Ticket Content */}
          <div className="p-6 bg-white max-h-[80vh] overflow-y-auto">
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{selectedTicket.subject}</h3>
                  {getStatusBadge(selectedTicket.status)}
                </div>

                <div className="border-t border-dashed my-2 border-gray-300"></div>

                <div>
                  <p><span className="font-semibold">Ticket ID:</span> {String(selectedTicket.id).substring(0, 8)}</p>
                  <p><span className="font-semibold">Created:</span> {new Date(selectedTicket.created_at).toLocaleString()}</p>
                  <p><span className="font-semibold">Status:</span> {selectedTicket.status}</p>
                </div>

                <div className="border-t border-dashed my-2 border-gray-300"></div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>

                <div className="border-t border-dashed my-2 border-gray-300"></div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Support Response</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="italic text-gray-500 text-sm">No responses yet. Our team will respond shortly.</p>
                  </div>
                </div>

                <div className="flex justify-end mt-4 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    Close Ticket
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Support;