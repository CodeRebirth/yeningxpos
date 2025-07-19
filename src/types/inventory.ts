
export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  stock_quantity: number;
  sku: string;
  cost_price?: number;
}
