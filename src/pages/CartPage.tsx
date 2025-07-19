import { Cart } from '../components/marketplace/Cart';
import { MarketplaceNav } from '../components/marketplace/MarketplaceNav';

export default function CartPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketplaceNav />
      <main className="py-8">
        <Cart />
      </main>
    </div>
  );
}
