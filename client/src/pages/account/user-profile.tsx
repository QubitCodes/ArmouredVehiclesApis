import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessToken, clearTokens, api } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { 
  User, Package, Heart, RotateCcw, Shield, Bell, Lock, 
  LogOut, ChevronLeft, Save, Camera, CreditCard
} from "lucide-react";
import { useState, useEffect } from "react";

export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+971 501234567',
    address: 'Al Qusais, Dubai, United Arab Emirates'
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLocation('/auth/login');
    }
  }, [setLocation]);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: api.auth.me
  });

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || ''
      }));
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast({ title: "Profile updated", description: "Your profile has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ name: formData.name, email: formData.email });
  };

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

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-slate-50 min-h-screen py-20 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#3D4736] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading profile...</p>
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
              <div className="bg-[#EFEBE4] p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#3D4736] rounded-full text-white grid place-items-center font-bold">
                    {getUserInitials()}
                  </div>
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

              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Orders & Activity</div>
                <SidebarItem icon={Package} label="Orders" href="/account/profile" />
                <SidebarItem icon={Heart} label="Wishlist" href="/account/wishlist" />
                <SidebarItem icon={RotateCcw} label="Returns" />
                <SidebarItem icon={Shield} label="Warranty Claims" />
                
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">My Account</div>
                <SidebarItem icon={User} label="User Profile" active />
                <SidebarItem icon={User} label="Address" />
                <SidebarItem icon={CreditCard} label="Payments" />
                
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">Others</div>
                <SidebarItem icon={Bell} label="Notifications" />
                <SidebarItem icon={Lock} label="Security Settings" href="/account/profile" />
              </div>

              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <SidebarItem icon={LogOut} label="Log Out" onClick={handleLogout} />
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <Link href="/account/profile">
                  <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors" data-testid="back-to-profile">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </Link>
                <h1 className="text-3xl font-display font-bold uppercase text-[#3D4736]">
                  Edit Profile
                </h1>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-200">
                  <div className="relative">
                    <div className="w-24 h-24 bg-[#3D4736] rounded-full text-white grid place-items-center font-bold text-2xl">
                      {getUserInitials()}
                    </div>
                    <button 
                      className="absolute bottom-0 right-0 w-8 h-8 bg-orange-600 rounded-full text-white grid place-items-center shadow-lg hover:bg-orange-700 transition-colors"
                      data-testid="change-avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{currentUser?.name || 'John Martin'}</h3>
                    <p className="text-sm text-slate-500">Member since 2024</p>
                  </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-[#EFEBE4] border-transparent"
                        data-testid="input-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-[#EFEBE4] border-transparent"
                        data-testid="input-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-[#EFEBE4] border-transparent"
                        data-testid="input-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="bg-[#EFEBE4] border-transparent"
                        data-testid="input-address"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <Link href="/account/profile">
                      <Button type="button" variant="outline" className="border-slate-300">
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      className="bg-[#3D4736] hover:bg-[#2A3324]"
                      disabled={updateProfileMutation.isPending}
                      data-testid="save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
