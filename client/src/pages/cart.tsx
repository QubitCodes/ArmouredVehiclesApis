import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ProductImage from "@/components/ui/product-image";
import { Trash2, ArrowRight, RotateCcw, Heart, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: api.cart.get,
    enabled: isAuthenticated,
  });

  const { data: recommendedProducts } = useQuery({
    queryKey: ['topSelling'],
    queryFn: api.products.getTopSelling
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => 
      api.cart.update(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.cart.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({ title: "Item removed from cart" });
    },
  });

  const handleQuantityChange = (id: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    updateMutation.mutate({ id, quantity: newQty });
  };

  const subtotal = cartItems?.reduce((acc, item) => 
    acc + (parseFloat(item.product.price) * item.quantity), 0) || 0;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen pb-20">
          <div className="container mx-auto px-4 py-20 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please log in to view your cart</h2>
            <p className="text-slate-500 mb-6">You need to be logged in to add items to your cart</p>
            <Link href="/auth/login">
              <Button className="bg-orange-600 hover:bg-orange-700">Login</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </Layout>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen pb-20">
          <div className="container mx-auto px-4 py-20 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Add some products to get started</p>
            <Link href="/products">
              <Button className="bg-orange-600 hover:bg-orange-700">Browse Products</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/products">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer">
                <ArrowRight className="h-4 w-4 rotate-180" /> CONTINUE SHOPPING
              </div>
            </Link>
          </div>

          <h1 className="text-3xl font-display font-bold mb-8 uppercase">
            My Cart <span className="text-lg text-muted-foreground font-normal normal-case">({cartItems.length} items)</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 relative" data-testid={`cart-item-${item.id}`}>
                  <div className="flex gap-6">
                    <Link href={`/products/${item.product.id}`}>
                      <div className="w-24 h-24 bg-slate-50 rounded-md overflow-hidden border flex-shrink-0 cursor-pointer">
                        <ProductImage src={item.product.image} alt={item.product.name} className="w-full h-full object-contain p-2" placeholderClassName="w-full h-full" />
                      </div>
                    </Link>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/products/${item.product.id}`}>
                          <h3 className="font-bold text-slate-900 text-lg leading-tight max-w-[70%] hover:text-orange-600 cursor-pointer">
                            {item.product.name}
                          </h3>
                        </Link>
                        <div className="text-right">
                          <div className="text-2xl font-bold font-display text-slate-900">
                            AED {(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-sm text-slate-500">
                              AED {parseFloat(item.product.price).toFixed(2)} each
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-green-600 font-medium mb-1">
                        {item.product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">SKU: {item.product.sku}</div>
                      <div className="text-xs text-slate-500 mb-4">{item.product.make} {item.product.model}</div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                        <div className="text-xs text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                          <RotateCcw className="h-3 w-3" /> 30-day return policy
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                            disabled={item.quantity <= 1 || updateMutation.isPending}
                            data-testid={`btn-decrease-${item.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                            disabled={updateMutation.isPending}
                            data-testid={`btn-increase-${item.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-slate-50 text-xs text-muted-foreground font-medium">
                    <button 
                      className="flex items-center gap-1 hover:text-destructive transition-colors"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      data-testid={`btn-remove-${item.id}`}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors">
                      <Heart className="h-3 w-3" /> Save for later
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="bg-[#EFEBE4] rounded-lg p-6 sticky top-24">
                <h3 className="font-display font-bold text-lg mb-6 uppercase">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>AED {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>VAT (5%)</span>
                    <span>AED {tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input placeholder="Enter Promo Code" className="bg-white border-white/50" />
                    <Button className="bg-[#3D4736] hover:bg-[#2A3324] text-white">APPLY</Button>
                  </div>
                </div>

                <Separator className="bg-slate-300 my-4" />
                
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-xl">AED {total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-6">(Inclusive of VAT)</div>

                <Link href="/checkout">
                  <Button 
                    className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 uppercase tracking-wider"
                    data-testid="button-checkout"
                  >
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {recommendedProducts && recommendedProducts.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold uppercase">Recommended For You</h2>
                <Link href="/products" className="text-sm text-orange-600 font-bold hover:underline">View All &gt;</Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendedProducts.slice(0, 4).map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <div className="bg-white p-4 rounded-lg border hover:border-orange-300 transition-colors cursor-pointer">
                      <div className="aspect-square mb-3 flex items-center justify-center">
                        <img src={product.image} className="max-w-full max-h-full object-contain" alt={product.name} />
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2 mb-2">{product.name}</h4>
                      <div className="font-bold text-orange-600">AED {parseFloat(product.price).toLocaleString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
