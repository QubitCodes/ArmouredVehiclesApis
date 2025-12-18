import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function CartPage() {
  // Mock cart items
  const cartItems = [
    {
      id: 1,
      name: "Performance Brake Kit - Ceramic",
      price: 450.00,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200",
      sku: "BRK-001-CER"
    },
    {
      id: 2,
      name: "Synthetic Motor Oil 5W-30",
      price: 125.00,
      quantity: 2,
      image: "https://images.unsplash.com/photo-1574360774620-192cb91b8606?auto=format&fit=crop&q=80&w=200",
      sku: "OIL-SYN-003"
    }
  ];

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const shipping = 25.00;
  const total = subtotal + tax + shipping;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border shadow-sm divide-y">
              {cartItems.map((item) => (
                <div key={item.id} className="p-6 flex gap-6">
                  <div className="w-24 h-24 bg-secondary rounded overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">{item.name}</h3>
                        <div className="text-sm text-muted-foreground mb-1">SKU: {item.sku}</div>
                        <div className="text-sm text-green-600 font-medium">In Stock</div>
                      </div>
                      <div className="text-lg font-bold">${item.price.toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Qty:</span>
                        <Input type="number" min="1" defaultValue={item.quantity} className="w-16 h-8" />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Link href="/products">
              <Button variant="outline" className="gap-2">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-card rounded-lg border shadow-sm p-6 sticky top-24">
              <h3 className="font-display font-bold text-lg mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Estimate</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Coupon Code" />
                  <Button variant="outline">Apply</Button>
                </div>
                <Button className="w-full h-12 text-base font-bold gap-2">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                  <span>Secure Checkout</span>
                  <span>•</span>
                  <span>Money-back Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
