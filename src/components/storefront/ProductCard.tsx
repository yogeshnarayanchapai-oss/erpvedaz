import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sell_price: number;
  cost_price: number;
  images: string[];
  is_active: boolean;
}

interface ProductCardProps {
  product: Product;
  storeSlug: string;
}

export function ProductCard({ product, storeSlug }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.sell_price,
      image: product.images?.[0] || undefined,
      slug: product.slug,
    });

    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link to={`/shop/${product.slug}`}>
      <Card className="group hover:shadow-lg transition-shadow overflow-hidden h-full">
        <div className="aspect-square overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">
              Rs. {product.sell_price.toLocaleString()}
            </span>
            <Button
              size="icon"
              onClick={handleAddToCart}
              className="rounded-full"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
