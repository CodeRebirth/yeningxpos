-- Create categories table
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.marketplace_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  rating NUMERIC(3, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.marketplace_suppliers(id) ON DELETE CASCADE,
  image_url TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON public.marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_supplier ON public.marketplace_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_user ON public.marketplace_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_order ON public.marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_product ON public.marketplace_order_items(product_id);

-- Create RLS policies for security
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Allow public to view products and categories
CREATE POLICY "Enable read access for all users" 
ON public.marketplace_products 
FOR SELECT 
USING (true);

CREATE POLICY "Enable read access for all users" 
ON public.marketplace_categories 
FOR SELECT 
USING (true);

-- Allow users to manage their own orders
CREATE POLICY "Enable users to manage their own orders"
ON public.marketplace_orders
FOR ALL
USING (auth.uid() = user_id);

-- Allow users to manage their own order items
CREATE POLICY "Enable users to manage their own order items"
ON public.marketplace_order_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.marketplace_orders o 
  WHERE o.id = order_id AND o.user_id = auth.uid()
));

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_marketplace_products_updated_at
BEFORE UPDATE ON public.marketplace_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_orders_updated_at
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(quantity * price_per_unit), 0) INTO total
  FROM public.marketplace_order_items
  WHERE order_id = $1;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;
