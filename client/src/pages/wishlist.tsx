import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Heart, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    const stored = localStorage.getItem('wishlist');
    if (stored) {
      try {
        setWishlistIds(JSON.parse(stored));
      } catch {
        setWishlistIds([]);
      }
    }
  }, []);

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.getAll(),
  });

  const wishlistProducts = allProducts?.filter(p => wishlistIds.includes(p.id)) || [];

  const removeFromWishlist = (productId: number) => {
    const newWishlist = wishlistIds.filter(id => id !== productId);
    setWishlistIds(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    toast({
      title: "Removed from wishlist",
      description: "Product has been removed from your wishlist.",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-display font-bold uppercase text-slate-900">My Wishlist</h1>
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-slate-800">Your wishlist is empty</h2>
              <p className="text-slate-500 mb-6">Browse products and add them to your wishlist</p>
              <Link href="/products">
                <Button className="bg-orange-600 hover:bg-orange-700">Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`wishlist-item-${product.id}`}
                >
                  <Link href={`/products/${product.id}`}>
                    <div className="aspect-square bg-slate-100 p-4">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-bold text-sm text-slate-800 mb-2 line-clamp-2 hover:text-orange-600">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="mb-4">
                      {isAuthenticated && product.price ? (
                        <div className="font-bold text-lg text-slate-900">
                          AED {parseFloat(product.price.toString()).toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic">Login for Price</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/products/${product.id}`} className="flex-1">
                        <Button 
                          className="w-full bg-orange-600 hover:bg-orange-700 text-xs"
                          data-testid={`wishlist-view-${product.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => removeFromWishlist(product.id)}
                        data-testid={`wishlist-remove-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
