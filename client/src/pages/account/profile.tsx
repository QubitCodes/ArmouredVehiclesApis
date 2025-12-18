import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { 
  User, Package, Heart, RotateCcw, Shield, Bell, Lock, 
  LogOut, CheckCircle2, XCircle, Search, ChevronDown, ShoppingCart
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const [, setLocation] = useLocation();

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: api.getOrders
  });

  const handleLogout = () => {
    // Logic to clear auth would go here
    setLocation('/');
  };

  const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
    <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${active ? "bg-[#3D4736] text-white" : "hover:bg-slate-100 text-slate-700"}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );

  return (
    <Layout>
      <div className="bg-[#3D4736] text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs">
          <div className="flex gap-4">
             {/* Breadcrumbs or secondary nav */}
          </div>
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
            
            {/* Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
              {/* User Profile Summary */}
              <div className="bg-[#EFEBE4] p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#3D4736] rounded-full text-white grid place-items-center font-bold">JM</div>
                  <div>
                    <div className="font-bold text-sm">Hello, John Martin</div>
                    <div className="text-xs text-muted-foreground">info@johnmartin.com</div>
                  </div>
                </div>
                <div className="text-xs font-medium text-orange-600 mb-1">Profile Completion 80%</div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[80%]" />
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Orders & Activity</div>
                <SidebarItem icon={Package} label="Orders" active />
                <SidebarItem icon={Heart} label="Wishlist" />
                <SidebarItem icon={RotateCcw} label="Returns" />
                <SidebarItem icon={Shield} label="Warranty Claims" />
                
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">My Account</div>
                <SidebarItem icon={User} label="User Profile" />
                <SidebarItem icon={User} label="Address" />
                <SidebarItem icon={CreditCard} label="Payments" />

                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">Others</div>
                <SidebarItem icon={Bell} label="Notifications" />
                <SidebarItem icon={Lock} label="Security Settings" />
                
                <div className="p-4 mt-2 border-t">
                  <Button variant="ghost" className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Log Out
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <h1 className="text-2xl font-display font-bold mb-6 uppercase">Orders</h1>

              <div className="flex items-center gap-4 mb-6">
                 <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                   <Input placeholder="Find Items" className="pl-9 bg-[#EFEBE4] border-transparent" />
                 </div>
                 <Button variant="outline" className="bg-[#EFEBE4] border-transparent">
                   Last 3 Months <ChevronDown className="h-4 w-4 ml-2" />
                 </Button>
              </div>

              {/* In Progress Section */}
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold uppercase text-slate-500">In Progress (1 item)</h3>
                
                {orders?.filter(o => o.status === 'processing').map(order => (
                  <div key={order.id} className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-green-700 text-sm mb-1">Delivery by today</div>
                        <div className="text-xs text-muted-foreground">Dispatched - on time</div>
                      </div>
                      <Button className="bg-[#3D4736] hover:bg-[#2A3324] text-xs h-8">
                        TRACK YOUR ORDER
                      </Button>
                    </div>

                    <div className="flex gap-4 items-center bg-white p-4 rounded border border-slate-100">
                      <div className="w-16 h-16 bg-slate-50 rounded p-2 flex-shrink-0">
                        <img src={order.items[0].image} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900">{order.items[0].name}</h4>
                        <div className="font-bold text-sm mt-1">AED {order.items[0].price.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground mt-2">
                      Order ID: #{order.id}
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-slate-500">Completed</h3>

                {orders?.filter(o => o.status === 'delivered' || o.status === 'cancelled').map(order => (
                  <div key={order.id} className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200 opacity-90">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'delivered' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <div className="font-bold text-sm">
                            {order.status === 'delivered' ? `Delivered on ${order.date}` : `Cancelled on ${order.date}`}
                          </div>
                        </div>
                      </div>
                      {order.status === 'cancelled' && (
                        <Button variant="outline" size="sm" className="h-8 text-xs border-slate-300">
                          TRACK REFUND
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-4 items-center bg-white p-4 rounded border border-slate-100">
                      <div className="w-16 h-16 bg-slate-50 rounded p-2 flex-shrink-0">
                        <img src={order.items[0].image} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900">{order.items[0].name}</h4>
                        <div className="font-bold text-sm mt-1">AED {order.items[0].price.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground mt-2">
                      Order ID: #{order.id}
                    </div>
                  </div>
                ))}
              </div>

            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
// Adding CreditCard import since it was missing
import { CreditCard } from "lucide-react";
