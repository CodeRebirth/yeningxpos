
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderItem, ReceiptDataType } from '@/types/pos';
import { useSettings } from '@/context/SettingsContext';

interface ReceiptDialogProps {
  showReceiptDialog: boolean;
  setShowReceiptDialog: (show: boolean) => void;
  receiptData: ReceiptDataType | null;
  orderItems: OrderItem[];
  customerName: string;
  tableNumber: string;
  paymentMethod: string;
  calculateTotal: () => number;
  calculateTax: () => number;
  generateOrderNumber: () => string;
  resetOrder: () => void;
}

const ReceiptDialog: React.FC<ReceiptDialogProps> = ({
  showReceiptDialog,
  setShowReceiptDialog,
  receiptData,
  orderItems,
  customerName,
  tableNumber,
  paymentMethod,
  calculateTotal,
  calculateTax,
  generateOrderNumber,
  resetOrder
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings(); // Get settings including tax_rate

  // Handle new order button click
  const handleNewOrder = () => {
    resetOrder();
    setShowReceiptDialog(false);
  };

  const printReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Please allow popups for this website to print receipts');
        return;
      }
      
      const receiptContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt</title>
            <style>
              @media print {
                @page {
                  size: 80mm 297mm;
                  margin: 0;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              body { 
                font-family: Arial, sans-serif; 
                max-width: 300px; 
                margin: 0 auto; 
                padding: 10px;
                font-size: 12px;
              }
              .header { text-align: center; margin-bottom: 15px; }
              .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .receipt-info { margin-bottom: 20px; }
              .receipt-info div { margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              th, td { text-align: left; padding: 5px 0; }
              .total-section { margin-top: 15px; border-top: 1px dashed #000; padding-top: 15px; }
              .total-row { font-weight: bold; margin-top: 5px; }
              .footer { margin-top: 25px; text-align: center; font-size: 12px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>
        
        <div ref={receiptRef} className="p-6 border rounded-lg bg-white">
          {/* Receipt Header */}
          <div className="header">
            <div className="store-name">{settings.business_name || 'RESTAURANT'}</div>
            <div>{settings.address || ''}</div>
            <div>Tel: {settings.phone_number || ''}</div>
            <div className="divider"></div>
          </div>
          
          {/* Receipt Info */}
          <div className="receipt-info">
            <div><strong>Receipt #:</strong> {receiptData?.orderNumber || generateOrderNumber()}</div>
            <div><strong>Date:</strong> {receiptData?.orderDate || ''}</div>
            <div><strong>Time:</strong> {receiptData?.orderTime || ''}</div>
            <div><strong>Customer:</strong> {customerName || 'Guest'}</div>
            {tableNumber && <div><strong>Table:</strong> {tableNumber}</div>}
            <div><strong>Payment Method:</strong> {paymentMethod === 'cash' ? 'Cash' : 'Card'}</div>
            <div className="divider"></div>
          </div>
          
          {/* Items */}
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>₹{item.price.toFixed(2)}</td>
                  <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="divider"></div>
          
          {/* Totals */}
          <div className="total-section">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax {settings.tax_rate}%:</span>
              <span>₹{calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between total-row">
              <span>Total:</span>
              <span>₹{(calculateTotal() + calculateTax()).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="divider"></div>
          
          {/* Footer */}
          <div className="footer">
            <p>Thank you for dining with us!</p>
            <p>Please come again</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleNewOrder}>
            New Order
          </Button>
          <Button onClick={printReceipt} className="bg-viilare-500">
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
