import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useEffect, useState } from "react";

export default function CheckoutSuccessPage() {
  const search = useSearch();
  const sessionId = new URLSearchParams(search).get('session_id');
  const [orderNumber] = useState(() => 
    `ORD-${Date.now().toString(36).toUpperCase()}`
  );

  useEffect(() => {
    if (sessionId) {
      console.log("Checkout session completed:", sessionId);
    }
  }, [sessionId]);

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="container mx-auto px-4 py-20 text-center max-w-2xl">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-display font-bold mb-2 text-slate-900">
              Order Confirmed!
            </h1>
            
            <p className="text-lg text-slate-600 mb-6">
              Thank you for your purchase. Your order has been successfully placed.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-slate-500 mb-1">Order Number</div>
              <div className="text-xl font-bold font-mono">{orderNumber}</div>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm text-slate-600 mb-8">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Estimated delivery: 3-5 business days</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-8">
              A confirmation email has been sent to your email address with order details and tracking information.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/account/profile?section=orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  View My Orders
                </Button>
              </Link>
              <Link href="/products">
                <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
