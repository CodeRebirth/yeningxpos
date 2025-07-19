
import React from 'react';
import { Input } from '@/components/ui/input';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Product, Category } from '@/types/pos';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductSectionProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  categories: Category[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProducts: Product[];
  isLoading: boolean;
  addToOrder: (product: Product) => void;
  getCategoryName: (categoryId: string) => string;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  activeCategory,
  setActiveCategory,
  categories,
  searchQuery,
  setSearchQuery,
  filteredProducts,
  isLoading,
  addToOrder,
  getCategoryName
}) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top navigation bar */}
      <div className="sticky top-0 w-full bg-white border-b border-gray-200 z-10 shadow-sm">
        {/* Top header with logo, search and notification */}
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-800">POS</h1>
          
          {/* Centered search bar */}
          <div className="relative max-w-md w-full mx-4">
            <Input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
        </div>
        
        {/* Categories section - horizontal scrolling */}
        <div className="px-4 pb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Categories</h2>
          <ScrollArea className="w-full" orientation="horizontal" hideScrollbar={false}>
            <div className="flex space-x-2 pb-2 px-0.5">
              <button
                key="All Items"
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeCategory === 'All Items' 
                    ? 'bg-viilare-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveCategory('All Items')}
              >
                All Items
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeCategory === category.name 
                      ? 'bg-viilare-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Product catalog - scrollable */}
      <ScrollArea className="flex-1" hideScrollbar={false}>
        <div className="p-4 md:p-6">
          {/* Featured banner */}
          <div className="mb-6 bg-red-800 rounded-lg overflow-hidden h-40 relative">
            <div className="p-6 w-1/2 text-white z-10 relative">
              <div className="text-yellow-300 text-sm font-bold mb-1">HERE!</div>
              <h3 className="text-3xl font-bold mb-1">EXTRA BIG</h3>
              <h2 className="text-5xl font-bold uppercase mb-1">BURGER</h2>
              <p className="text-xs font-medium">LIMITED TIME OFFER</p>
            </div>
            <img 
              src="/placeholder.svg" 
              alt="Featured burger" 
              className="absolute right-0 top-0 h-full w-1/2 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/600x400/red/white?text=Burger';
              }}
            />
          </div>
          
          {/* Products grid with loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-viilare-500" />
              <span className="ml-2 text-lg text-gray-600">Loading products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-xl text-gray-500">No products found</div>
              <p className="text-gray-400">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToOrder(product)}
                >
                  <img 
                    src={product.image_url || 'https://placehold.co/600x400/orange/white?text=Food'} 
                    alt={product.name} 
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/600x400/orange/white?text=Food';
                    }}
                  />
                  <div className="p-4">
                    <h3 className="text-viilare-500 font-bold text-lg mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                    <div className="font-bold text-xl">₹{product.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {getCategoryName(product.category)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductSection;
