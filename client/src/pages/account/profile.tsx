import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductImage from "@/components/ui/product-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api as mockApi } from "@/lib/mockApi";
import { api, clearTokens, getAccessToken } from "@/lib/api";
import { 
  User, Package, Heart, RotateCcw, Shield, Bell, Lock, 
  LogOut, CheckCircle2, XCircle, Search, ChevronDown, ShoppingCart,
  Monitor, Smartphone, Laptop, Tablet, Globe, Trash2, CreditCard
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<'orders' | 'sessions'>('orders');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: mockApi.getOrders
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: api.auth.me
  });

  const getUserInitials = () => {
    if (!currentUser?.name) return 'JM';
    const names = currentUser.name.split(' ');
    return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: api.auth.getSessions,
    enabled: activeSection === 'sessions',
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => api.auth.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast({ title: "Session revoked", description: "The session has been logged out." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke session.", variant: "destructive" });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: api.auth.logoutAll,
    onSuccess: () => {
      clearTokens();
      setLocation('/auth/login');
      toast({ title: "Logged out everywhere", description: "All sessions have been ended." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log out all sessions.", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore errors
    }
    clearTokens();
    setLocation('/');
  };

  const getDeviceIcon = (deviceLabel: string) => {
    const label = deviceLabel.toLowerCase();
    if (label.includes('mobile') || label.includes('iphone') || label.includes('android')) {
      return Smartphone;
    }
    if (label.includes('tablet') || label.includes('ipad')) {
      return Tablet;
    }
    if (label.includes('mac') || label.includes('windows') || label.includes('linux')) {
      return Laptop;
    }
    if (label.includes('desktop')) {
      return Monitor;
    }
    return Globe;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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
              {/* User Profile Summary */}
              <div className="bg-[#EFEBE4] p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#3D4736] rounded-full text-white grid place-items-center font-bold">{getUserInitials()}</div>
                  <div>
                    <div className="font-bold text-sm">Hello, {currentUser?.name || 'John Martin'}</div>
                    <div className="text-xs text-muted-foreground">{currentUser?.email || 'info@johnmartin.com'}</div>
                  </div>
                </div>
                <div className="text-xs font-medium text-orange-600 mb-1">Profile Completion {currentUser?.completionPercentage || 80}%</div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${currentUser?.completionPercentage || 80}%` }} />
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Orders & Activity</div>
                <SidebarItem icon={Package} label="Orders" active={activeSection === 'orders'} onClick={() => setActiveSection('orders')} />
                <SidebarItem icon={Heart} label="Wishlist" href="/account/wishlist" />
                <SidebarItem icon={RotateCcw} label="Returns" />
                <SidebarItem icon={Shield} label="Warranty Claims" />
                
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">My Account</div>
                <SidebarItem icon={User} label="User Profile" href="/account/profile/edit" />
                <SidebarItem icon={User} label="Address" />
                <SidebarItem icon={CreditCard} label="Payments" />

                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">Security</div>
                <SidebarItem icon={Monitor} label="Active Sessions" active={activeSection === 'sessions'} onClick={() => setActiveSection('sessions')} />
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
              {activeSection === 'orders' && (
                <>
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
                          <Link href={`/account/orders/${order.id}/track`}>
                            <Button className="bg-[#3D4736] hover:bg-[#2A3324] text-xs h-8" data-testid={`track-order-${order.id}`}>
                              TRACK YOUR ORDER
                            </Button>
                          </Link>
                        </div>

                        <div className="flex gap-4 items-center bg-white p-4 rounded border border-slate-100">
                          <div className="w-16 h-16 bg-slate-50 rounded p-2 flex-shrink-0">
                            <ProductImage src={order.items[0].image} className="w-full h-full object-contain" alt="Order item" placeholderClassName="w-full h-full" />
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
                          <Link href={`/account/orders/${order.id}/details`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-300" data-testid={`view-details-${order.id}`}>
                              {order.status === 'cancelled' ? 'TRACK REFUND' : 'VIEW DETAILS'}
                            </Button>
                          </Link>
                        </div>

                        <div className="flex gap-4 items-center bg-white p-4 rounded border border-slate-100">
                          <div className="w-16 h-16 bg-slate-50 rounded p-2 flex-shrink-0">
                            <ProductImage src={order.items[0].image} className="w-full h-full object-contain" alt="Order item" placeholderClassName="w-full h-full" />
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
                </>
              )}

              {activeSection === 'sessions' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-display font-bold uppercase">Active Sessions</h1>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => logoutAllMutation.mutate()}
                      disabled={logoutAllMutation.isPending}
                      data-testid="button-logout-all"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {logoutAllMutation.isPending ? 'Logging out...' : 'Log Out All Devices'}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    These are the devices currently logged into your account. You can revoke access to any session you don't recognize.
                  </p>

                  {sessionsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200 animate-pulse">
                          <div className="h-5 bg-slate-300 rounded w-1/3 mb-3" />
                          <div className="h-4 bg-slate-200 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : sessions?.length === 0 ? (
                    <div className="bg-[#EFEBE4] rounded-lg p-8 text-center">
                      <Monitor className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600">No active sessions found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sessions?.map(session => {
                        const DeviceIcon = getDeviceIcon(session.deviceLabel);
                        return (
                          <div 
                            key={session.id} 
                            className={`bg-[#EFEBE4] rounded-lg p-6 border ${session.isCurrent ? 'border-green-400 ring-2 ring-green-100' : 'border-slate-200'}`}
                            data-testid={`session-card-${session.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${session.isCurrent ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                  <DeviceIcon className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm">{session.deviceLabel}</h3>
                                    {session.isCurrent && (
                                      <Badge className="bg-green-600 text-white text-xs">Current Session</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    IP: {session.ipAddress}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last active: {formatRelativeTime(session.lastUsedAt)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Started: {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              {!session.isCurrent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => revokeSessionMutation.mutate(session.id)}
                                  disabled={revokeSessionMutation.isPending}
                                  data-testid={`button-revoke-${session.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Revoke
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
