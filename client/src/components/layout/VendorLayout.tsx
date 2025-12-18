import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { api, clearTokens } from "@/lib/api";

interface VendorLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const navItems = [
  { path: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/vendor/products', label: 'Products', icon: Package },
  { path: '/vendor/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/vendor/customers', label: 'Customers', icon: Users },
  { path: '/vendor/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/vendor/settings', label: 'Settings', icon: Settings },
];

export default function VendorLayout({ children, title, subtitle, actions }: VendorLayoutProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearTokens();
      localStorage.removeItem('user');
      setLocation('/auth/login');
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r" style={{ backgroundColor: '#1A1F16' }}>
          <div className="p-6 border-b" style={{ borderColor: '#2D3629' }}>
            <h2 className="text-lg font-bold font-display text-white">Vendor Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Manage your store</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path || location.startsWith(item.path + '/');
              return (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start gap-3 h-11 ${
                      isActive 
                        ? 'text-white font-medium' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    style={isActive ? { backgroundColor: '#646E51' } : {}}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t" style={{ borderColor: '#2D3629' }}>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {(title || actions) && (
            <div className="bg-white border-b px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  {title && <h1 className="text-2xl font-display font-bold text-slate-800">{title}</h1>}
                  {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            </div>
          )}
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </Layout>
  );
}
