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

const getPrimaryColor = () => {
  return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#0891b2';
};

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
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (buttonRef.current) {
      const primary = getPrimaryColor();
      buttonRef.current.style.background = `linear-gradient(135deg, ${primary} 60%, ${primary}20 100%)`;
    }
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-white/70 backdrop-blur-lg border border-gray-200/60 rounded-2xl shadow-xl overflow-hidden transition-all duration-200 hover:shadow-2xl group",
        isInCart ? "ring-2 ring-[var(--primary-color)]/40" : "hover:border-[var(--primary-color)]/60"
      )}
      style={{
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
        border: '1.5px solid rgba(200,200,200,0.20)',
        background: 'rgba(255,255,255,0.75)',
      }}
    >
      {image && (
        <div className="relative flex justify-center -mt-8 mb-2 z-10">
          <div className="rounded-xl shadow-lg bg-white/60 p-1">
            <img
              src={image}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-100"
              loading="lazy"
              style={{ boxShadow: '0 2px 16px 0 rgba(0,0,0,0.06)' }}
            />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col px-4 pt-2 pb-4 gap-1">
        <div className="flex items-center gap-2 mb-1">
          {category && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-semibold tracking-wide">
              {category}
            </span>
          )}
        </div>
        <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate mb-1" title={name}>{name}</h3>
        <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-2">{description}</p>
        <div className="flex items-end justify-between mt-auto">
          <span className="font-bold text-lg text-[var(--primary-color)] drop-shadow-sm">₹{price.toFixed(2)}</span>
          
          {!isInCart ? (
            <Button
              ref={buttonRef}
              onClick={onAddToCart}
              size="sm"
              className="
                text-white
                rounded-full
                h-10 w-10 sm:w-auto sm:px-5
                flex items-center justify-center gap-2
                font-semibold
                shadow-md
                transition-all duration-200
                hover:scale-105 hover:shadow-lg
                focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/40 focus:ring-offset-2
                active:scale-95
                bg-gradient-to-tr from-[var(--primary-color)] via-[var(--primary-color)]/80 to-[var(--primary-color)]/60
              "
              style={{
                background: `linear-gradient(135deg, ${getPrimaryColor()} 70%, ${getPrimaryColor()}20 100%)`
              }}
            >
              <FontAwesomeIcon icon={["fas", "cart-plus"]} className="h-5 w-5 sm:mr-1 drop-shadow-sm" />
              <span className="hidden sm:inline font-semibold tracking-wide">Add</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={onDecreaseQuantity}
                variant="ghost"
                size="sm"
                className="rounded-full p-0 h-8 w-8 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10"
              >
                <MinusCircle className="h-5 w-5" />
              </Button>
              <span className="mx-1 sm:mx-2 font-bold text-base text-gray-800 bg-white/70 px-2 py-0.5 rounded-lg shadow-sm border border-gray-100">
                {quantity}
              </span>
              <Button
                onClick={onIncreaseQuantity}
                variant="ghost"
                size="sm"
                className="rounded-full p-0 h-8 w-8 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;