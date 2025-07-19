import { Product } from '../../types/marketplace';

interface ProductCardProps {
  product: Product;
  onViewDetails: () => void;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="h-48 bg-gray-100 flex items-center justify-center">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-gray-400">No image available</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
          {product.description || 'No description available'}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-blue-600">
            ${product.price_per_unit.toFixed(2)}
            {product.unit && <span className="text-sm text-gray-500"> / {product.unit}</span>}
          </span>
          <button
            onClick={onViewDetails}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
