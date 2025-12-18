import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowRight, Printer, RotateCcw, Share2, Heart, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";

export default function CartPage() {
  const { data: recommendedProducts } = useQuery({
    queryKey: ['recommended', 'cart'],
    queryFn: () => api.getRecommendedProducts(1) // Just fetching some recommendations
  });

  // Mock cart items based on Figma
  const cartItems = [
    {
      id: 1,
      name: "DFC - 4000 HybridDynamic Hybrid Rear Brake Pads",
      price: 679.00,
      originalPrice: 799.00,
      discount: "15% Off",
      quantity: 2,
      image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200",
      sku: "54094DL",
      stockStatus: "In Stock",
      delivery: "Standard Delivery | Estimated delivery tomorrow",
      warranty: "12 months/12,000 Miles Limited Warranty"
    },
    {
      id: 2,
      name: "Duralast 45084DL High-Performance Disc Brake Rotor",
      price: 475.00,
      originalPrice: 599.00,
      discount: "21% Off",
      quantity: 1,
      image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=200",
      sku: "45084DL",
      stockStatus: "In Stock",
      delivery: "Standard Delivery | Estimated delivery tomorrow",
      warranty: "12 months/12,000 Miles Limited Warranty"
    },
    {
      id: 3,
      name: "Duralast Heavy-Duty Disc Brake Rotor 54094DL Reliable OEM-Grade Performance",
      price: 1625.00,
      originalPrice: null,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200",
      sku: "54094DL",
      stockStatus: "Temporarily out of stock",
      stockStatusColor: "text-red-500",
      delivery: "Standard Delivery | Estimated delivery tomorrow",
      warranty: "12 months/12,000 Miles Limited Warranty"
    }
  ];

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% VAT assumption
  const total = subtotal + tax;

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer">
              <ArrowRight className="h-4 w-4 rotate-180" /> CONTINUE SHOPPING
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>

          <h1 className="text-3xl font-display font-bold mb-8 uppercase">My Cart <span className="text-lg text-muted-foreground font-normal normal-case">({cartItems.length} items)</span></h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 relative">
                  <div className="flex gap-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-md overflow-hidden border flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight max-w-[70%]">{item.name}</h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold font-display text-slate-900">
                            AED {item.price.toFixed(2)}
                          </div>
                          {item.originalPrice && (
                            <div className="text-sm text-muted-foreground line-through">
                              {item.originalPrice.toFixed(2)} <span className="text-green-600 no-underline ml-1">{item.discount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`text-xs font-medium mb-1 ${item.stockStatusColor || "text-green-600"}`}>
                        {item.stockStatus}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">Part #{item.sku}</div>
                      <div className="text-xs text-slate-500 mb-1">{item.delivery}</div>
                      <div className="text-xs text-slate-500 mb-4">{item.warranty}</div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                        <div className="text-xs text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                          <RotateCcw className="h-3 w-3" /> This item cannot be exchanged or returned.
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-slate-50 text-xs text-muted-foreground font-medium">
                    <button className="flex items-center gap-1 hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /> Remove</button>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors"><Heart className="h-3 w-3" /> Save for later</button>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors"><Share2 className="h-3 w-3" /> Share</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <div className="bg-[#EFEBE4] rounded-lg p-6 sticky top-24">
                <h3 className="font-display font-bold text-lg mb-6 uppercase">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>AED {subtotal.toFixed(2)}</span>
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
                <div className="text-xs text-muted-foreground mb-6">(Inclusive of VAT) Taxes and Shipping calculated at checkout</div>

                <Link href="/checkout">
                  <Button className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 uppercase tracking-wider">
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Recommended Section */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold uppercase">Recommended For You</h2>
              <Link href="/products" className="text-sm text-orange-600 font-bold hover:underline">View All &gt;</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {recommendedProducts?.map((product) => (
                <div key={product.id} className="h-full">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
