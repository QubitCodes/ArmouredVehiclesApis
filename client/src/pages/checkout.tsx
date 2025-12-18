import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, CreditCard, AlertTriangle, Loader2, ShoppingBag, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [showTestModeWarning, setShowTestModeWarning] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    if (!token) {
      setLocation('/auth/login');
    }
  }, [setLocation]);

  const { data: cartItems, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: api.cart.get,
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: api.checkout.createSession,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.testMode) {
        setShowTestModeWarning(true);
        toast({
          title: "Sample Environment",
          description: "Stripe is not configured. This is a demo environment.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (paymentMethod === "card") {
      checkoutMutation.mutate();
    } else {
      toast({
        title: "Coming Soon",
        description: "This payment method will be available soon.",
      });
    }
  };

  if (!isAuthenticated || cartLoading) {
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
            <p className="text-slate-500 mb-6">Add some products to checkout</p>
            <Link href="/products">
              <Button className="bg-orange-600 hover:bg-orange-700">Browse Products</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const subtotal = cartItems.reduce((acc, item) => 
    acc + (parseFloat(item.product.price) * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 40;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="bg-[#3D4736] text-white py-3 px-4 text-xs font-medium">
          <div className="container mx-auto">
            <Link href="/cart">
              <span className="cursor-pointer hover:underline">BACK TO CART ({cartItems.length} Items)</span>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {showTestModeWarning && (
            <Alert className="mb-6 border-orange-300 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Sample Environment</AlertTitle>
              <AlertDescription className="text-orange-700">
                This is a sample environment. Stripe payment integration requires valid API credentials to process real payments.
                In production, customers would be redirected to Stripe's secure checkout page.
              </AlertDescription>
            </Alert>
          )}

          <h1 className="text-2xl font-display font-bold mb-8 uppercase flex items-center gap-2">
            <Link href="/cart">
              <ArrowLeft className="h-5 w-5 cursor-pointer hover:text-orange-600" />
            </Link>
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#EFEBE4] rounded-lg p-6">
                <h3 className="font-bold text-sm uppercase mb-4">Shipping Address</h3>
                <div className="bg-white p-4 rounded border border-orange-200 flex justify-between items-start">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-slate-600 mt-1" />
                    <div>
                      <div className="font-bold text-sm mb-1">Default Address</div>
                      <div className="text-xs text-muted-foreground leading-relaxed max-w-md">
                        Please update your shipping address during checkout
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#EFEBE4] rounded-lg p-6">
                <h3 className="font-bold text-sm uppercase mb-4 flex justify-between">
                  Delivery Instructions
                </h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="items-together" defaultChecked />
                  <label htmlFor="items-together" className="text-sm font-medium leading-none">
                    Get items together
                  </label>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-6 uppercase">Your Order</h2>
                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div key={item.id} className="bg-[#EFEBE4] p-4 rounded-lg flex gap-4" data-testid={`checkout-item-${item.id}`}>
                      <div className="w-16 h-16 bg-white rounded border flex-shrink-0 overflow-hidden">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-sm">
                            Shipment {index + 1} of {cartItems.length} 
                            <span className="text-slate-500 font-normal"> ({item.quantity} item{item.quantity > 1 ? 's' : ''})</span>
                          </h4>
                          <span className="text-xs text-green-600 font-bold">Est. 3-5 business days</span>
                        </div>
                        <p className="text-sm font-medium mt-1 line-clamp-1">{item.product.name}</p>
                        <p className="font-bold text-sm mt-1">AED {(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-display font-bold mb-6 uppercase">Payment</h2>
                <div className="bg-[#EFEBE4] rounded-lg overflow-hidden">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-0 divide-y divide-slate-200">
                    <div className="flex items-center justify-between p-4 bg-white/50">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Debit/Credit Card (Stripe)</Label>
                      </div>
                      <CreditCard className="h-5 w-5 text-slate-500" />
                    </div>
                  </RadioGroup>
                </div>
                <div className="mt-4 p-4 bg-slate-100 rounded-lg flex items-center gap-3 text-sm text-slate-600">
                  <Lock className="h-4 w-4" />
                  <span>Your payment is secured with SSL encryption and processed by Stripe</span>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-[#EFEBE4] rounded-lg p-6 sticky top-24">
                <h3 className="font-display font-bold text-lg mb-6 uppercase">Order Summary</h3>
                
                <div className="space-y-3 text-sm font-medium mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>AED {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `AED ${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>VAT (5%)</span>
                    <span>AED {tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline mb-1 pt-4 border-t border-slate-300">
                  <span className="font-bold text-lg">Total <span className="text-xs font-normal text-slate-500">(Inclusive of VAT)</span></span>
                  <span className="font-bold text-xl">AED {total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-right text-slate-500 mb-6">Estimated VAT: AED {tax.toFixed(2)}</div>

                <Button 
                  className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 uppercase tracking-wider"
                  onClick={handlePlaceOrder}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-place-order"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>

                <p className="text-xs text-center text-slate-500 mt-4">
                  By placing this order, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
