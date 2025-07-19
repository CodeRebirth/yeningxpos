export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

export interface ReceiptDataType {
  orderId: string;
  orderNumber: string;
  orderDate?: string;
  orderTime?: string;
}