import Layout from "@/components/layout/Layout";
import AccountSidebar from "@/components/layout/AccountSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductImage from "@/components/ui/product-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, clearTokens, getAccessToken } from "@/lib/api";
import { 
  User, CheckCircle2, XCircle, Search, ChevronDown, LogOut,
  Monitor, Smartphone, Laptop, Tablet, Globe, Trash2, CreditCard,
  MapPin, Plus, Home, Building2, Star, Wallet, Shield
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Address, SavedPaymentMethod } from "@shared/schema";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [activeSection, setActiveSection] = useState<'orders' | 'sessions' | 'addresses' | 'payments'>('orders');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressType, setAddressType] = useState<'home' | 'work' | 'other'>('home');
  const [addressCountry, setAddressCountry] = useState('AE');
  const [addressIsDefault, setAddressIsDefault] = useState(false);

  // Read section from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const section = params.get('section');
    if (section === 'orders' || section === 'sessions' || section === 'addresses' || section === 'payments') {
      setActiveSection(section);
    }
  }, [searchString]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.getAll
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

  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: api.addresses.getAll,
    enabled: activeSection === 'addresses',
  });

  const { data: savedPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['saved-payments'],
    queryFn: api.payments.getAll,
    enabled: activeSection === 'payments',
  });

  // Address mutations
  const createAddressMutation = useMutation({
    mutationFn: (data: Partial<Address>) => api.addresses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: "Address added", description: "Your new address has been saved." });
      setShowAddressDialog(false);
      setEditingAddress(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add address.", variant: "destructive" });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Address> }) => api.addresses.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: "Address updated", description: "Your address has been updated." });
      setShowAddressDialog(false);
      setEditingAddress(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update address.", variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => api.addresses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: "Address deleted", description: "Your address has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete address.", variant: "destructive" });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: (id: number) => api.addresses.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: "Default updated", description: "Your default address has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to set default address.", variant: "destructive" });
    },
  });

  // Payment mutations
  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => api.payments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-payments'] });
      toast({ title: "Payment method removed", description: "Your payment method has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment method.", variant: "destructive" });
    },
  });

  const setDefaultPaymentMutation = useMutation({
    mutationFn: (id: number) => api.payments.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-payments'] });
      toast({ title: "Default updated", description: "Your default payment method has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to set default payment method.", variant: "destructive" });
    },
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

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            <AccountSidebar 
              currentUser={currentUser}
              activeSection={activeSection}
              onLogout={handleLogout}
            />

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
                                {order.status === 'delivered' ? `Delivered on ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}` : `Cancelled on ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}`}
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

              {activeSection === 'addresses' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-display font-bold uppercase">Saved Addresses</h1>
                    <Dialog open={showAddressDialog} onOpenChange={(open) => {
                      if (!open) {
                        setEditingAddress(null);
                      }
                      setShowAddressDialog(open);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-[#3D4736] hover:bg-[#2A3324]" 
                          data-testid="button-add-address"
                          onClick={() => {
                            setEditingAddress(null);
                            setAddressType('home');
                            setAddressCountry('AE');
                            setAddressIsDefault(false);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Address
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const addressData = {
                            label: formData.get('label') as string,
                            addressType: addressType,
                            fullName: formData.get('fullName') as string,
                            phone: formData.get('phone') as string,
                            addressLine1: formData.get('addressLine1') as string,
                            addressLine2: formData.get('addressLine2') as string || undefined,
                            city: formData.get('city') as string,
                            state: formData.get('state') as string,
                            postalCode: formData.get('postalCode') as string,
                            country: addressCountry,
                            isDefault: addressIsDefault,
                          };
                          if (editingAddress) {
                            updateAddressMutation.mutate({ id: editingAddress.id, data: addressData });
                          } else {
                            createAddressMutation.mutate(addressData);
                          }
                        }} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="label">Address Label</Label>
                              <Input id="label" name="label" placeholder="e.g., Home, Office" defaultValue={editingAddress?.label || ''} required />
                            </div>
                            <div>
                              <Label htmlFor="addressType">Type</Label>
                              <Select value={addressType} onValueChange={(v) => setAddressType(v as 'home' | 'work' | 'other')}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="home">Home</SelectItem>
                                  <SelectItem value="work">Work</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="fullName">Full Name</Label>
                              <Input id="fullName" name="fullName" defaultValue={editingAddress?.fullName || ''} required />
                            </div>
                            <div>
                              <Label htmlFor="phone">Phone</Label>
                              <Input id="phone" name="phone" defaultValue={editingAddress?.phone || ''} required />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="addressLine1">Address Line 1</Label>
                            <Input id="addressLine1" name="addressLine1" defaultValue={editingAddress?.addressLine1 || ''} required />
                          </div>
                          <div>
                            <Label htmlFor="addressLine2">Address Line 2</Label>
                            <Input id="addressLine2" name="addressLine2" defaultValue={editingAddress?.addressLine2 || ''} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="city">City</Label>
                              <Input id="city" name="city" defaultValue={editingAddress?.city || ''} required />
                            </div>
                            <div>
                              <Label htmlFor="state">State</Label>
                              <Input id="state" name="state" defaultValue={editingAddress?.state || ''} required />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="postalCode">Postal Code</Label>
                              <Input id="postalCode" name="postalCode" defaultValue={editingAddress?.postalCode || ''} required />
                            </div>
                            <div>
                              <Label htmlFor="country">Country</Label>
                              <Select value={addressCountry} onValueChange={setAddressCountry}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AE">UAE</SelectItem>
                                  <SelectItem value="IN">India</SelectItem>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="GB">United Kingdom</SelectItem>
                                  <SelectItem value="SA">Saudi Arabia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="isDefault" checked={addressIsDefault} onCheckedChange={(checked) => setAddressIsDefault(!!checked)} />
                            <Label htmlFor="isDefault">Set as default address</Label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => { setShowAddressDialog(false); setEditingAddress(null); }}>Cancel</Button>
                            <Button type="submit" className="bg-[#3D4736] hover:bg-[#2A3324]">
                              {editingAddress ? 'Update' : 'Save'} Address
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    Manage your delivery addresses. You can set a default address for faster checkout.
                  </p>

                  {addressesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map(i => (
                        <div key={i} className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200 animate-pulse">
                          <div className="h-5 bg-slate-300 rounded w-1/3 mb-3" />
                          <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                          <div className="h-4 bg-slate-200 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : addresses?.length === 0 ? (
                    <div className="bg-[#EFEBE4] rounded-lg p-8 text-center">
                      <MapPin className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600">No addresses saved yet.</p>
                      <p className="text-sm text-slate-500 mt-2">Add an address to make checkout faster.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses?.map(address => (
                        <div 
                          key={address.id} 
                          className={`bg-[#EFEBE4] rounded-lg p-6 border ${address.isDefault ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}
                          data-testid={`address-card-${address.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {address.addressType === 'home' ? <Home className="h-5 w-5 text-[#3D4736]" /> : <Building2 className="h-5 w-5 text-[#3D4736]" />}
                              <h3 className="font-bold text-sm">{address.label}</h3>
                              {address.isDefault && (
                                <Badge className="bg-orange-600 text-white text-xs">Default</Badge>
                              )}
                              {address.isVerified && (
                                <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-slate-700 space-y-1">
                            <p className="font-medium">{address.fullName}</p>
                            <p>{address.addressLine1}</p>
                            {address.addressLine2 && <p>{address.addressLine2}</p>}
                            <p>{address.city}, {address.state} {address.postalCode}</p>
                            <p>{address.country === 'AE' ? 'UAE' : address.country === 'IN' ? 'India' : address.country === 'US' ? 'USA' : address.country === 'GB' ? 'UK' : address.country}</p>
                            <p className="text-slate-500">{address.phone}</p>
                          </div>
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => { 
                                setEditingAddress(address); 
                                setAddressType(address.addressType as 'home' | 'work' | 'other');
                                setAddressCountry(address.country);
                                setAddressIsDefault(address.isDefault || false);
                                setShowAddressDialog(true); 
                              }}
                              data-testid={`button-edit-address-${address.id}`}
                            >
                              Edit
                            </Button>
                            {!address.isDefault && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs"
                                onClick={() => setDefaultAddressMutation.mutate(address.id)}
                                data-testid={`button-set-default-${address.id}`}
                              >
                                <Star className="h-3 w-3 mr-1" /> Set Default
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => deleteAddressMutation.mutate(address.id)}
                              data-testid={`button-delete-address-${address.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeSection === 'payments' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-display font-bold uppercase">Saved Payment Methods</h1>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800">Secure Payment Storage</p>
                        <p className="text-blue-600 mt-1">
                          Your payment information is securely stored in compliance with PCI-DSS standards. 
                          We only store the last 4 digits and a secure token - never your full card details.
                          {/* Regulatory compliance for India (RBI), UAE (Central Bank), US, and UK */}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    Payment methods saved during checkout will appear here. You can manage and remove saved methods.
                  </p>

                  {paymentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="bg-[#EFEBE4] rounded-lg p-6 border border-slate-200 animate-pulse">
                          <div className="h-5 bg-slate-300 rounded w-1/4 mb-3" />
                          <div className="h-4 bg-slate-200 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : savedPayments?.length === 0 ? (
                    <div className="bg-[#EFEBE4] rounded-lg p-8 text-center">
                      <Wallet className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600">No payment methods saved yet.</p>
                      <p className="text-sm text-slate-500 mt-2">Payment methods will be saved automatically during checkout when you choose "Save for future purchases".</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedPayments?.map(payment => (
                        <div 
                          key={payment.id} 
                          className={`bg-[#EFEBE4] rounded-lg p-6 border ${payment.isDefault ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}
                          data-testid={`payment-card-${payment.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                                {payment.cardBrand === 'visa' && <span className="text-blue-600 font-bold text-lg">VISA</span>}
                                {payment.cardBrand === 'mastercard' && <span className="text-orange-600 font-bold text-sm">MC</span>}
                                {payment.cardBrand === 'amex' && <span className="text-blue-800 font-bold text-sm">AMEX</span>}
                                {!['visa', 'mastercard', 'amex'].includes(payment.cardBrand || '') && <CreditCard className="h-6 w-6 text-slate-400" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm capitalize">{payment.cardBrand || payment.paymentMethodType}</h3>
                                  {payment.isDefault && (
                                    <Badge className="bg-orange-600 text-white text-xs">Default</Badge>
                                  )}
                                </div>
                                {payment.lastFourDigits && (
                                  <p className="text-sm text-slate-600 mt-1">•••• •••• •••• {payment.lastFourDigits}</p>
                                )}
                                {payment.cardholderName && (
                                  <p className="text-xs text-slate-500">{payment.cardholderName}</p>
                                )}
                                {payment.expiryMonth && payment.expiryYear && (
                                  <p className="text-xs text-slate-500">Expires {payment.expiryMonth}/{payment.expiryYear}</p>
                                )}
                                {payment.maskedUpiId && (
                                  <p className="text-sm text-slate-600 mt-1">UPI: {payment.maskedUpiId}</p>
                                )}
                                {payment.bankName && (
                                  <p className="text-xs text-slate-500">{payment.bankName}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                  {payment.country === 'IN' && payment.hasRbiConsent && '✓ RBI consent provided'}
                                  {payment.country === 'AE' && '✓ UAE Central Bank compliant'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!payment.isDefault && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => setDefaultPaymentMutation.mutate(payment.id)}
                                  data-testid={`button-set-default-payment-${payment.id}`}
                                >
                                  <Star className="h-3 w-3 mr-1" /> Set Default
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => deletePaymentMutation.mutate(payment.id)}
                                data-testid={`button-delete-payment-${payment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
