import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle, ShoppingCart, CirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Add Font Awesome icons to library
library.add(fas);

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  onAddToCart: () => void;
  isInCart: boolean;
  quantity?: number;
  onIncreaseQuantity?: () => void;
  onDecreaseQuantity?: () => void;
  description: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  category,
  onAddToCart,
  isInCart,
  quantity = 0,
  onIncreaseQuantity,
  onDecreaseQuantity,
  description
}) => {
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 flex flex-col h-full",
        isInCart ? "ring-2 ring-viilare-500 ring-opacity-50" : "hover:shadow-md"
      )}
    >
      {image && (
        <div className="h-24 sm:h-32 bg-gray-100 overflow-hidden">
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="p-2 sm:p-3 flex-1 flex flex-col">
        {category && (
          <span className="text-xs font-medium text-gray-500 uppercase truncate">{category}</span>
        )}
        <h3 className="font-medium text-gray-800 mb-1 text-sm sm:text-base truncate" title={name}>{name}</h3>
        <div className="flex justify-between items-center mt-auto">
          <span className="font-bold text-viilare-600 text-sm sm:text-base">₹{price.toFixed(2)}</span>
          
          {!isInCart ? (
            <Button 
              onClick={onAddToCart}
              size="sm" 
              className="bg-viilare-500 hover:bg-viilare-600 text-white rounded-full h-8 w-8 sm:w-auto sm:px-3 flex items-center justify-center"
            >
              {/* <ShoppingCart className="h-4 w-4 sm:mr-1" /> */}
              <FontAwesomeIcon icon={["fas", "cart-plus"]} className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          ) : (
            <div className="flex items-center">
              <Button 
                onClick={onDecreaseQuantity}
                variant="ghost" 
                size="sm" 
                className="p-0 sm:p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full"
              >
                <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-viilare-500" />
              </Button>
              <span className="mx-1 sm:mx-2 font-medium text-sm sm:text-base">{quantity}</span>
              <Button 
                onClick={onIncreaseQuantity}
                variant="ghost" 
                size="sm" 
                className="p-0 sm:p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-viilare-500" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;