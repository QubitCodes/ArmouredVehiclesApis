import Layout from "@/components/layout/Layout";
import AccountSidebar from "@/components/layout/AccountSidebar";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/ui/product-image";
import { useQuery } from "@tanstack/react-query";
import { api, getAccessToken, clearTokens } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { Heart, Trash2, ShoppingCart, Loader2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function WishlistPage() {
  const [location, setLocation] = useLocation();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = getAccessToken();
    const authenticated = !!token;
    setIsAuthenticated(authenticated);
    
    if (!authenticated) {
      setLocation('/auth/login');
      return;
    }
    
    const stored = localStorage.getItem('wishlist');
    if (stored) {
      try {
        setWishlistIds(JSON.parse(stored));
      } catch {
        setWishlistIds([]);
      }
    }
  }, [setLocation]);

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

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore errors
    }
    clearTokens();
    setLocation('/');
  };

  if (isAuthenticated === null || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="bg-[#3D4736] text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs">
          <div className="flex gap-4">
          </div>
          <div className="flex items-center gap-4">
             <Link href="/seller/dashboard">
               <Button size="sm" variant="outline" className="h-7 bg-white text-slate-900 border-white hover:bg-slate-100 font-bold text-xs uppercase rounded-full px-4">
                 Supplier Zone
               </Button>
             </Link>
             <div className="flex items-center gap-2">
               <span>Account</span>
               <div className="w-6 h-6 rounded-full border border-white grid place-items-center">
                 <User className="h-3 w-3" />
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            <AccountSidebar 
              activeSection="wishlist"
              onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1">
              <h1 className="text-2xl font-display font-bold mb-6 uppercase">Wishlist</h1>

              {wishlistProducts.length === 0 ? (
                <div className="bg-[#EFEBE4] rounded-lg p-12 text-center">
                  <Heart className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <h2 className="text-xl font-bold mb-2 text-slate-800">Your wishlist is empty</h2>
                  <p className="text-slate-500 mb-6">Browse products and add them to your wishlist</p>
                  <Link href="/products">
                    <Button className="bg-orange-600 hover:bg-orange-700">Browse Products</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">{wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''} in your wishlist</p>
                  
                  {wishlistProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200"
                      data-testid={`wishlist-item-${product.id}`}
                    >
                      <div className="flex gap-4 items-center">
                        <Link href={`/products/${product.id}`}>
                          <div className="w-20 h-20 bg-white rounded p-2 flex-shrink-0 cursor-pointer hover:ring-2 ring-orange-300 transition-all">
                            <ProductImage 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-contain"
                              placeholderClassName="w-full h-full" 
                            />
                          </div>
                        </Link>
                        <div className="flex-1">
                          <Link href={`/products/${product.id}`}>
                            <h4 className="font-bold text-sm text-slate-900 hover:text-orange-600 cursor-pointer">{product.name}</h4>
                          </Link>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                          )}
                          <div className="font-bold text-sm mt-2">AED {parseFloat(product.price?.toString() || '0').toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/products/${product.id}`}>
                            <Button 
                              className="bg-[#3D4736] hover:bg-[#2A3324] text-xs"
                              data-testid={`wishlist-view-${product.id}`}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              View Product
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="border-red-200 hover:bg-red-50"
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
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
