export interface Product {
  id: string;
  name: string;
  description?: string;
  price_per_unit: number;
  unit: string;
  category: string;
  image_url?: string;
  supplier_id: string;
  stock_quantity: number;
  min_order_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}
