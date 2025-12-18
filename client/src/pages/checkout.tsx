import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, CreditCard, Apple, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutPage() {
  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="bg-[#3D4736] text-white py-3 px-4 text-xs font-medium">
          <div className="container mx-auto">
            BACK TO CART (3 Items)
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-display font-bold mb-8 uppercase flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" /> Shipping Address
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Address Section */}
              <div className="bg-[#EFEBE4] rounded-lg p-6">
                <h3 className="font-bold text-sm uppercase mb-4">Address</h3>
                <div className="bg-white p-4 rounded border border-orange-200 flex justify-between items-start mb-4 relative">
                  <div className="flex gap-3">
                     <MapPin className="h-5 w-5 text-slate-600 mt-1" />
                     <div>
                       <div className="font-bold text-sm mb-1">Deliver to Work</div>
                       <div className="text-xs text-muted-foreground leading-relaxed max-w-md">
                         3-56th St - Al Wasl - Dubai - Dubai Dubai, 3 - 56th St Al Wasl - Dubai - Dubai,
                         Dubai, United Arab Emirates
                       </div>
                     </div>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400">
                    &gt;
                  </div>
                </div>
              </div>

              {/* Delivery Instructions */}
              <div className="bg-[#EFEBE4] rounded-lg p-6">
                <h3 className="font-bold text-sm uppercase mb-4 flex justify-between">
                  Delivery Instructions
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                </h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="items-together" defaultChecked />
                  <label htmlFor="items-together" className="text-sm font-medium leading-none">
                    Get items together
                  </label>
                </div>
              </div>

              {/* Receiver Info */}
              <div className="bg-[#EFEBE4] rounded-lg p-6">
                <h3 className="font-bold text-sm uppercase mb-4">Who will receive this order?</h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-orange-200">
                     <div className="w-6 h-6 bg-slate-800 text-white rounded-full text-xs grid place-items-center">JM</div>
                     <div className="text-xs">
                       <div className="font-bold">John Martin</div>
                       <div>+971-555-012345</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded border border-transparent">
                     <Checkbox id="someone-else" />
                     <label htmlFor="someone-else" className="text-xs">Someone else will receive it</label>
                   </div>
                </div>
              </div>

              {/* Order Summary Items */}
              <div>
                <h2 className="text-2xl font-display font-bold mb-6 uppercase">Your Order</h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#EFEBE4] p-4 rounded-lg flex gap-4">
                      <div className="w-16 h-16 bg-white rounded border flex-shrink-0">
                         {/* Placeholder Image */}
                         <div className="w-full h-full bg-slate-100" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-sm">Shipment {i} of 3 <span className="text-slate-500 font-normal">(1 item)</span></h4>
                          <span className="text-xs text-green-600 font-bold">Get it by Wed, Nov 5</span>
                        </div>
                        <p className="text-sm font-medium mt-1">DFC - 4000 HybridDynamic Hybrid Rear Brake Pads</p>
                        <p className="font-bold text-sm mt-1">AED 679.00</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section */}
              <div>
                 <h2 className="text-2xl font-display font-bold mb-6 uppercase">Payment</h2>
                 <div className="bg-[#EFEBE4] rounded-lg overflow-hidden">
                   <RadioGroup defaultValue="card" className="gap-0 divide-y divide-slate-200">
                     <div className="flex items-center justify-between p-4 bg-white/50">
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="card" id="card" />
                         <Label htmlFor="card">Debit/Credit Card</Label>
                       </div>
                       <CreditCard className="h-5 w-5 text-slate-500" />
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/50">
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="tabby" id="tabby" />
                         <div className="grid gap-1.5 leading-none">
                           <Label htmlFor="tabby">Tabby</Label>
                           <span className="text-xs text-muted-foreground">Split in up to 4 payments</span>
                         </div>
                       </div>
                       <div className="h-5 w-12 bg-green-500 rounded text-[10px] text-white grid place-items-center">tabby</div>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/50">
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="tamara" id="tamara" />
                         <div className="grid gap-1.5 leading-none">
                           <Label htmlFor="tamara">Tamara</Label>
                           <span className="text-xs text-muted-foreground">Pay in 3 simple, interest free payments</span>
                         </div>
                       </div>
                       <div className="h-5 w-12 bg-pink-500 rounded text-[10px] text-white grid place-items-center">tamara</div>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/50">
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="apple" id="apple" />
                         <Label htmlFor="apple">Apple Pay</Label>
                       </div>
                       <Apple className="h-5 w-5 text-slate-800" />
                     </div>
                   </RadioGroup>
                 </div>
              </div>

            </div>

            {/* Sidebar Summary */}
            <div>
              <div className="bg-[#EFEBE4] rounded-lg p-6 sticky top-24">
                <h3 className="font-display font-bold text-lg mb-6 uppercase">Order Summary</h3>
                
                <div className="space-y-3 text-sm font-medium mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal (3 items)</span>
                    <span>AED 2779.00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping Fee</span>
                    <span>AED 40</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Additional Documents processing</span>
                    <span>AED 918</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline mb-1 pt-4 border-t border-slate-300">
                  <span className="font-bold text-lg">Total <span className="text-xs font-normal text-slate-500">(Inclusive of VAT)</span></span>
                  <span className="font-bold text-xl">AED 3,737.00</span>
                </div>
                <div className="text-xs text-right text-slate-500 mb-6">Estimated VAT: AED 177.95</div>

                <Button className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 uppercase tracking-wider">
                  Place Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
