# F&B Marketplace Module

This module allows logged-in users to browse and purchase raw materials for their food and beverage business.

## Features

- Browse products by category
- Search for specific products
- View product details
- Add products to cart
- Manage cart items (update quantities, remove items)
- Secure checkout process
- Order history
- Supplier information

## Database Schema

The marketplace module uses the following tables in the Supabase database:

1. `marketplace_categories` - Product categories
2. `marketplace_suppliers` - Product suppliers
3. `marketplace_products` - Products available for purchase
4. `marketplace_orders` - Customer orders
5. `marketplace_order_items` - Items within each order

## Setup

1. Run the SQL migration file to create the necessary tables:
   ```sql
   supabase migration up
   ```

2. The tables will be created with appropriate Row Level Security (RLS) policies.

## Pages

- `/marketplace` - Browse all products
- `/marketplace/:id` - View product details
- `/marketplace/cart` - View and manage cart

## Components

- `MarketplaceNav` - Navigation bar for the marketplace
- `ProductCard` - Displays a product in the product listing
- `Cart` - Shopping cart component
- `ProductDetail` - Detailed view of a single product

## Context

- `CartContext` - Manages the shopping cart state across the application

## Environment Variables

Make sure the following environment variables are set in your `.env` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing

1. Log in to the application
2. Navigate to the Marketplace
3. Browse products and add items to your cart
4. Proceed to checkout
5. Verify the order is created in the database

## Future Enhancements

- Product reviews and ratings
- Wishlist functionality
- Order tracking
- Discounts and promotions
- Bulk ordering
- Recurring orders
- Supplier dashboard
- Product variants and options
