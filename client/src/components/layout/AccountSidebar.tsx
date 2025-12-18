import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  User, Package, Heart, RotateCcw, Shield, Bell, Lock, 
  LogOut, Monitor, CreditCard, MapPin
} from "lucide-react";

interface AccountSidebarProps {
  currentUser?: { name?: string; email?: string; completionPercentage?: number; userType?: string } | null;
  activeSection?: 'orders' | 'sessions' | 'addresses' | 'payments' | 'profile' | 'wishlist';
  onSectionChange?: (section: 'orders' | 'sessions' | 'addresses' | 'payments') => void;
  onLogout?: () => void;
}

export default function AccountSidebar({ currentUser, activeSection, onSectionChange, onLogout }: AccountSidebarProps) {
  const getUserInitials = () => {
    if (!currentUser?.name) return 'JM';
    const names = currentUser.name.split(' ');
    return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const SidebarItem = ({ icon: Icon, label, active = false, onClick, href }: { 
    icon: any; 
    label: string; 
    active?: boolean; 
    onClick?: () => void; 
    href?: string;
  }) => {
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
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
      <div className="bg-[#EFEBE4] p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#3D4736] rounded-full text-white grid place-items-center font-bold">
            {getUserInitials()}
          </div>
          <div>
            <div className="font-bold text-sm">Hello, {currentUser?.name || 'Guest'}</div>
            <div className="text-xs text-muted-foreground">{currentUser?.email || ''}</div>
          </div>
        </div>
        <div className="text-xs font-medium text-orange-600 mb-1">Profile Completion {currentUser?.completionPercentage || 80}%</div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500" style={{ width: `${currentUser?.completionPercentage || 80}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Orders & Activity</div>
        <SidebarItem 
          icon={Package} 
          label="Orders" 
          active={activeSection === 'orders'} 
          href="/account/profile?section=orders"
        />
        <SidebarItem icon={Heart} label="Wishlist" href="/account/wishlist" active={activeSection === 'wishlist'} />
        <SidebarItem icon={RotateCcw} label="Returns" />
        <SidebarItem icon={Shield} label="Warranty Claims" />
        
        <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">My Account</div>
        <SidebarItem 
          icon={User} 
          label="User Profile" 
          href="/account/profile/edit" 
          active={activeSection === 'profile'}
        />
        <SidebarItem 
          icon={MapPin} 
          label="Addresses" 
          active={activeSection === 'addresses'} 
          href="/account/profile?section=addresses"
        />
        <SidebarItem 
          icon={CreditCard} 
          label="Saved Payments" 
          active={activeSection === 'payments'} 
          href="/account/profile?section=payments"
        />

        <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase mt-2">Security</div>
        <SidebarItem 
          icon={Monitor} 
          label="Active Sessions" 
          active={activeSection === 'sessions'} 
          href="/account/profile?section=sessions"
        />
        <SidebarItem icon={Bell} label="Notifications" />
        <SidebarItem icon={Lock} label="Security Settings" />
        
        {onLogout && (
          <div className="p-4 mt-2 border-t">
            <Button variant="ghost" className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Log Out
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
