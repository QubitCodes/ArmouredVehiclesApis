import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/ui/product-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { api as mockApi } from "@/lib/mockApi";
import { getAccessToken, clearTokens, api } from "@/lib/api";
import { Link, useLocation, useRoute } from "wouter";
import { 
  User, Package, Heart, RotateCcw, Shield, Bell, Lock, 
  LogOut, ChevronLeft, ChevronRight, Info, MessageCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";

export default function RefundDetailsPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/account/refunds/:id");
  const refundId = params?.id || "";
  const [showBreakup, setShowBreakup] = useState(false);
  const [faqOpen, setFaqOpen] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLocation('/auth/login');
    }
  }, [setLocation]);

  const { data: refund, isLoading: refundLoading } = useQuery({
    queryKey: ['refund', refundId],
    queryFn: () => api.refunds.getById(refundId),
    enabled: !!refundId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: api.auth.me
  });

  // Mock data for demo when no real refund exists
  const mockRefund = {
    id: refundId,
    amount: "679.00",
    status: "processing" as const,
    paymentMethod: "Tamara",
    triggerDate: new Date(),
    estimatedCreditDate: addDays(new Date(), 7),
    items: [
      { id: 1, name: "DFC - 4000 HybriDynamic Hybrid Rear Brake Pads", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100", price: "679.00", quantity: 1 },
      { id: 2, name: "Duralast 45084DL High-Performance Disc Brake Rotor", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=100", price: "475.00", quantity: 1 },
      { id: 3, name: "Duralast Heavy-Duty Disc Brake Rotor 54094DL Reliable OEM-Grade Performance", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=100", price: "1625.00", quantity: 1 },
    ]
  };

  const displayRefund = refund || mockRefund;
  const totalRefundAmount = displayRefund.items?.reduce((sum, item) => sum + parseFloat(item.price) * (item.quantity || 1), 0) || parseFloat(displayRefund.amount);

  const handleLogout = async () => {
    clearTokens();
    setLocation('/');
  };

  const getUserInitials = () => {
    if (!currentUser?.name) return 'JM';
    const names = currentUser.name.split(' ');
    return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const SidebarItem = ({ icon: Icon, label, active = false, onClick, href }: { icon: any, label: string, active?: boolean, onClick?: () => void, href?: string }) => {
    const content = (
      <div 
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${active ? "bg-[#3D4736] text-white" : "hover:bg-slate-100 text-slate-700"}`}
        onClick={onClick}
        data-testid={`sidebar-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
    
    if (href) {
      return <Link href={href}>{content}</Link>;
    }
    return content;
  };

  if (refundLoading) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen py-20 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#3D4736] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading refund details...</p>
        </div>
      </Layout>
    );
  }

  const triggerDate = displayRefund.triggerDate ? new Date(displayRefund.triggerDate) : new Date();
  const estimatedCreditDate = displayRefund.estimatedCreditDate ? new Date(displayRefund.estimatedCreditDate) : addDays(new Date(), 7);

  return (
    <Layout>
      <div className="bg-[#3D4736] text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs">
          <div className="flex gap-4"></div>
          <div className="flex items-center gap-4">
             <Link href="/seller/dashboard">
               <Button size="sm" variant="outline" className="h-7 bg-white text-slate-900 border-white hover:bg-slate-100 font-bold text-xs uppercase rounded-full px-4">
                 Supplier Zone
               </Button>
             </Link>
             <div className="flex items-center gap-2">
               <span>{currentUser?.name?.split(' ')[0] || 'John'}</span>
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
            
            {/* Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
              {/* User Profile Card */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-[#3D4736] text-white flex items-center justify-center font-bold text-lg">
                    {getUserInitials()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Hello, {currentUser?.name || 'John Martin'}</p>
                    <p className="text-sm text-slate-500">{currentUser?.email || 'info@johnmartin.com'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Profile Completion</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${currentUser?.completionPercentage || 80}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-orange-500">{currentUser?.completionPercentage || 80}%</span>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders & Activity</h3>
                </div>
                <SidebarItem icon={Package} label="Orders" href="/account/profile" />
                <SidebarItem icon={Heart} label="Wishlist" href="/account/wishlist" />
                <SidebarItem icon={RotateCcw} label="Returns" active />
                <SidebarItem icon={Shield} label="Warranty Claims" />
                
                <div className="px-4 py-3 border-b border-t border-slate-100 mt-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Account</h3>
                </div>
                <SidebarItem icon={User} label="User Profile" href="/account/profile/edit" />
                <SidebarItem icon={Package} label="Address" />
                <SidebarItem icon={Package} label="Payments" />
                
                <div className="px-4 py-3 border-b border-t border-slate-100 mt-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Others</h3>
                </div>
                <SidebarItem icon={Bell} label="Notifications" />
                <SidebarItem icon={Lock} label="Security Settings" />
                
                <div className="border-t border-slate-100 mt-2">
                  <SidebarItem icon={LogOut} label="Log Out" onClick={handleLogout} />
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {/* Back Link */}
              <Link href="/account/profile" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4">
                <ChevronLeft className="h-4 w-4" />
                Back to Order Details
              </Link>

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide" style={{ fontFamily: 'serif' }}>
                  REFUND DETAILS
                </h1>
                <p className="text-slate-500 mt-1">Track your refund and view the next steps</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Refund Info */}
                <div className="flex-1 space-y-6">
                  {/* Triggered Refunds Card */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="font-semibold text-slate-900">Triggered Refunds</h2>
                      <Info className="h-4 w-4 text-slate-400" />
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">Money sent, reaching your account soon.</p>
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <p className="text-lg font-bold text-green-600">৳ {displayRefund.amount}</p>
                        <p className="text-sm text-slate-500">Processed to {displayRefund.paymentMethod}</p>
                      </div>
                      <div className="w-16 h-10 bg-gradient-to-r from-pink-400 to-pink-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        {displayRefund.paymentMethod}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Trigger date</p>
                        <p className="font-medium text-slate-900">{format(triggerDate, 'EEEE, do MMM')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Est. Credit Date</p>
                        <p className="font-medium text-slate-900">{format(estimatedCreditDate, 'EEEE, do MMM')}</p>
                      </div>
                    </div>

                    {/* FAQ Accordion */}
                    <div className="border-t border-slate-100 pt-4">
                      <button 
                        onClick={() => setFaqOpen(!faqOpen)}
                        className="w-full flex items-center justify-between text-left"
                        data-testid="faq-toggle"
                      >
                        <span className="font-medium text-slate-900 flex items-center gap-2">
                          <Info className="h-4 w-4 text-slate-400" />
                          Haven't received your refund yet?
                        </span>
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${faqOpen ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {faqOpen && (
                        <div className="mt-3 text-sm text-slate-600">
                          <p className="mb-3">
                            Your refund was processed and sent to your {displayRefund.paymentMethod} account by Armored Mart on{' '}
                            <span className="font-medium">{format(triggerDate, 'EEEE, do MMM')}</span>. 
                            Banks usually take 5-7 business days to credit the amount.
                          </p>
                          <p>
                            If you don't see it by <span className="font-medium">{format(estimatedCreditDate, 'EEEE, do MMM')}</span>, 
                            please contact {displayRefund.paymentMethod} for assistance.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contact Button */}
                    <Button 
                      className="w-full mt-4 bg-[#3D4736] hover:bg-[#2d352a] text-white"
                      data-testid="contact-payment-provider"
                    >
                      CONTACT {displayRefund.paymentMethod?.toUpperCase()}
                    </Button>
                  </div>

                  {/* Triggered Items */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="font-semibold text-slate-900 mb-4">
                      TRIGGERED ITEMS <span className="text-slate-500 font-normal">({displayRefund.items?.length || 0} items)</span>
                    </h2>
                    
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {displayRefund.items?.map((item, index) => (
                        <div key={item.id || index} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200" data-testid={`refund-item-${index}`}>
                          <ProductImage 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      <button className="flex-shrink-0 w-10 h-20 flex items-center justify-center text-slate-400 hover:text-slate-600">
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="w-full lg:w-72 space-y-4">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-700">Order Total</span>
                      <span className="font-semibold">৳ {displayRefund.amount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-3">
                      <span>{displayRefund.paymentMethod}</span>
                      <span>৳ {displayRefund.amount}</span>
                    </div>
                    <div className="border-t border-amber-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-semibold">Refunded Amount</span>
                        <span className="text-green-600 font-semibold">৳ {displayRefund.amount}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowBreakup(true)}
                      className="text-sm text-blue-600 hover:underline mt-2"
                      data-testid="show-refund-breakup"
                    >
                      {showBreakup ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {/* Need Further Support */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-2">NEED FURTHER SUPPORT?</h3>
                    <p className="text-sm text-slate-600">
                      Check our Refund FAQ for details on refund policies, amount calculations, processing timelines, and payment methods.
                    </p>
                    <button className="mt-3 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Refund Breakup Dialog */}
      <Dialog open={showBreakup} onOpenChange={setShowBreakup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wide" style={{ fontFamily: 'serif' }}>
              REFUND BREAKUP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {displayRefund.items?.map((item, index) => (
              <div key={item.id || index} className="flex items-center gap-4 bg-amber-50 p-3 rounded-lg" data-testid={`breakup-item-${index}`}>
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <ProductImage 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{item.name}</p>
                  <p className="text-lg font-bold text-green-600 mt-1">৳ {item.price}</p>
                </div>
              </div>
            ))}
            
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Total refunded amount</p>
                <p className="text-2xl font-bold text-green-600" data-testid="total-refund-amount">৳ {totalRefundAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
