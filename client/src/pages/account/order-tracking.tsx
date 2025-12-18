import Layout from "@/components/layout/Layout";
import AccountSidebar from "@/components/layout/AccountSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductImage from "@/components/ui/product-image";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken, clearTokens, api } from "@/lib/api";
import { Link, useLocation, useRoute } from "wouter";
import { 
  User, Package, ChevronLeft, CheckCircle2, Clock, Truck, MapPin,
  FileText, X, Calendar, Shield, Lock
} from "lucide-react";
import { useState, useEffect } from "react";

interface TrackingStep {
  status: string;
  label: string;
  date: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

export default function OrderTrackingPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/account/orders/:id/track");
  const orderId = params?.id || "";

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLocation('/auth/login');
    }
  }, [setLocation]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.getAll
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: api.auth.me
  });

  const order = orders?.find(o => o.id === orderId);

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen py-20 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#3D4736] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading order details...</p>
        </div>
      </Layout>
    );
  }

  const getTrackingSteps = (): TrackingStep[] => {
    const statusMap: Record<string, number> = {
      'pending': 0,
      'processing': 2,
      'shipped': 3,
      'delivered': 4,
      'cancelled': -1
    };
    
    const currentStep = order ? statusMap[order.status] ?? 0 : 0;
    const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const orderDate = order?.createdAt ? formatDate(order.createdAt) : formatDate(new Date());
    
    const getStepDate = (stepIndex: number): string => {
      if (!order?.createdAt) return '';
      const baseDate = new Date();
      const dates = [
        orderDate,
        orderDate,
        orderDate,
        '',
        ''
      ];
      if (stepIndex < currentStep) {
        return dates[stepIndex] || orderDate;
      }
      return stepIndex <= currentStep ? orderDate : '';
    };
    
    return [
      {
        status: 'confirmed',
        label: 'Confirmed',
        date: getStepDate(0),
        completed: currentStep >= 0,
        current: currentStep === 0
      },
      {
        status: 'packed',
        label: 'Packed',
        date: getStepDate(1),
        completed: currentStep >= 1,
        current: currentStep === 1
      },
      {
        status: 'dispatched',
        label: 'Dispatched',
        date: getStepDate(2),
        description: currentStep === 2 ? 'Your shipment has been dispatched to the final hub. We\'ll notify you once it\'s out for delivery. When your order is almost there, we\'ll display the courier\'s contact number.' : undefined,
        completed: currentStep >= 2,
        current: currentStep === 2
      },
      {
        status: 'out_for_delivery',
        label: 'Out for delivery',
        date: getStepDate(3),
        description: currentStep === 3 ? 'Your package is on its way! The courier will deliver it shortly.' : undefined,
        completed: currentStep >= 3,
        current: currentStep === 3
      },
      {
        status: 'delivered',
        label: currentStep >= 4 ? 'Delivered' : 'Delivery by Today',
        date: currentStep >= 4 ? orderDate : '',
        description: currentStep === 4 ? 'Your order has been delivered successfully!' : undefined,
        completed: currentStep >= 4,
        current: currentStep === 4
      }
    ];
  };

  const trackingSteps = getTrackingSteps();
  const shipmentId = `AMUAE${order?.id?.replace(/-/g, '').slice(0, 12) || '0092259108'}`;

  const handleLogout = async () => {
    clearTokens();
    setLocation('/');
  };

  const getStepIcon = (step: TrackingStep) => {
    if (step.status === 'confirmed') return CheckCircle2;
    if (step.status === 'packed') return Package;
    if (step.status === 'dispatched') return Truck;
    if (step.status === 'out_for_delivery') return Truck;
    if (step.status === 'delivered') return MapPin;
    return Clock;
  };

  if (!order) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen py-20 text-center">
          <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order not found</h2>
          <p className="text-slate-500 mb-6">The order you're looking for doesn't exist.</p>
          <Link href="/account/profile">
            <Button className="bg-orange-600 hover:bg-orange-700">Go to Orders</Button>
          </Link>
        </div>
      </Layout>
    );
  }

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
               <span>John</span>
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
              currentUser={currentUser}
              activeSection="orders"
              onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <Link href="/account/profile">
                  <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors" data-testid="back-to-orders">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </Link>
                <h1 className="text-3xl font-display font-bold uppercase text-[#3D4736]">
                  Track Your Order
                </h1>
              </div>

              {/* Shipment Info Bar */}
              <div className="flex justify-between items-center mb-6 text-sm">
                <div>
                  <span className="text-slate-600">Shipment ID </span>
                  <span className="font-bold text-slate-900">{shipmentId}</span>
                </div>
                <div className="text-slate-600">
                  Order Date: <span className="font-medium text-slate-900">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
                {/* Delivery Address */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Delivery Address (Work)</h3>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">John Martin</p>
                    <p className="text-slate-600">Al Qusais, Dubai, United Arab Emirates</p>
                    <p className="text-slate-600 flex items-center gap-2">
                      +971 501234567 
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    </p>
                  </div>
                </div>

                {/* Tracking Timeline */}
                <div className="relative mb-8">
                  {trackingSteps.map((step, index) => {
                    const StepIcon = getStepIcon(step);
                    const isLast = index === trackingSteps.length - 1;
                    
                    return (
                      <div key={step.status} className="flex gap-4 relative">
                        {/* Timeline Line */}
                        {!isLast && (
                          <div 
                            className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${
                              step.completed ? 'bg-[#3D4736]' : 'bg-slate-200'
                            }`} 
                          />
                        )}
                        
                        {/* Icon */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.completed 
                            ? step.current 
                              ? 'bg-[#3D4736] text-white ring-4 ring-[#3D4736]/20' 
                              : 'bg-[#3D4736] text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          <StepIcon className="h-4 w-4" />
                        </div>
                        
                        {/* Content */}
                        <div className={`flex-1 pb-6 ${step.current ? '' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-bold ${step.current ? 'text-[#3D4736]' : step.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                                {step.label}
                                {step.date && <span className="font-normal text-slate-500 ml-2">on {step.date}</span>}
                              </p>
                              {step.current && step.status === 'dispatched' && (
                                <div className="mt-1">
                                  <span className="text-xs font-medium text-green-600">On time</span>
                                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                                    {step.description}
                                  </p>
                                </div>
                              )}
                            </div>
                            {step.status === 'confirmed' && (
                              <Button variant="outline" size="sm" className="text-xs h-8 border-slate-300">
                                RESCHEDULE
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <button className="text-sm text-slate-600 hover:text-slate-900 mt-2 flex items-center gap-1" data-testid="hide-full-tracking">
                    Hide full tracking <ChevronLeft className="h-4 w-4 rotate-90" />
                  </button>
                </div>

                {/* View Order / Invoice Summary */}
                <div className="border-t border-slate-200 pt-6 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 uppercase">View Order / Invoice Summary</h3>
                    <button className="text-sm text-slate-600 hover:text-orange-600 flex items-center gap-1" data-testid="view-invoice">
                      Find invoice and shipping details here <ChevronLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                </div>

                {/* Item Summary */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase mb-1">Item Summary</h3>
                      <p className="text-xs text-slate-500">Once packed, individual items cannot be cancelled.</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-8 border-slate-300" data-testid="cancel-shipment">
                      CANCEL SHIPMENT
                    </Button>
                  </div>

                  {/* Product Item */}
                  <div className="bg-[#EFEBE4] rounded-lg p-4 flex gap-4 items-center">
                    <div className="w-16 h-16 bg-white rounded p-2 flex-shrink-0">
                      <ProductImage 
                        src={order.items[0]?.image || ''} 
                        alt={order.items[0]?.name || 'Product'} 
                        className="w-full h-full object-contain"
                        placeholderClassName="w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 text-sm">{order.items[0]?.name || 'Product Name'}</h4>
                      <p className="font-bold text-slate-900 mt-1">
                        <span className="text-orange-600">AED</span> {parseFloat(order.items[0]?.price?.toString() || '0').toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Order ID */}
                  <div className="mt-4 text-right text-sm text-slate-500">
                    Order ID: <span className="font-medium text-slate-700">#{order.id?.slice(0, 18) || 'AMZ-12345678-987654'}</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-[#3D4736] py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-8 w-8" />
              <h4 className="font-bold uppercase text-sm">Compliance Built In</h4>
              <p className="text-xs text-slate-300">Global standards. Automatic protection.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Lock className="h-8 w-8" />
              <h4 className="font-bold uppercase text-sm">Secure Commerce Platform</h4>
              <p className="text-xs text-slate-300">Every transaction, fully encrypted.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8" />
              <h4 className="font-bold uppercase text-sm">Verified Sellers & Buyers</h4>
              <p className="text-xs text-slate-300">Only trusted partners allowed.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
