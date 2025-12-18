import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { api, getAccessToken, clearTokens } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  userType: 'customer' | 'vendor' | 'admin' | 'super_admin';
}

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoggedIn = !!user;

  const { data: cartItems } = useQuery({
    queryKey: ['cart'],
    queryFn: api.cart.get,
    enabled: isLoggedIn,
  });

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const searchSuggestions = useMemo(() => {
    if (!products || !searchTerm.trim() || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.make?.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [products, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchTerm)}`);
      setShowSuggestions(false);
    }
  };
  
  // Check localStorage for auth state on mount and when location changes
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = getAccessToken();
      if (storedUser && token) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    checkAuth();
    
    // Listen for storage changes (e.g., login/logout in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [location]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore errors
    }
    clearTokens();
    setUser(null);
    setLocation('/');
  };
  
  const isVendor = user?.userType === 'vendor';

  // New darker Green theme matching Figma
  const NAV_BG = "bg-white"; 
  const TOP_BAR_BG = "bg-[#3D4736]"; // Dark Green
  const BUTTON_ORANGE = "bg-[#D97706]"; // Orange

  const navLinks = [
    { href: "/products?cat=core", label: "Core Systems" },
    { href: "/products?cat=armor", label: "Armor Systems" },
    { href: "/products?cat=comms", label: "Comms & Control" },
    { href: "/products?cat=climate", label: "Climate & Interior" },
    { href: "/products?cat=exterior", label: "Exterior & Utility" },
    { href: "/products?cat=oem", label: "OEM / Custom Support" },
    { href: "/products?cat=chassis", label: "Chassis & Platforms" },
    { href: "/products?cat=sourcing", label: "OEM Sourcing" },
    { href: "/products?cat=tactical", label: "Tactical Hardware" },
  ];

  return (
    <div className="flex flex-col sticky top-0 z-50">
      {/* Top Header - White */}
      <div className="bg-white border-b py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-display font-bold text-[#3D4736] tracking-tighter">
                ARMOREDMART
              </span>
              <span className="text-[0.5rem] tracking-wide text-slate-500 uppercase">
                The World's First Compliance Integrated Defence E-Store
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xl mx-8 relative">
            <Input
              type="search"
              placeholder="Search Products"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full h-10 border-slate-300 rounded-none focus-visible:ring-0 focus-visible:border-[#D97706]"
              data-testid="input-navbar-search"
            />
            <Button type="submit" className={`${BUTTON_ORANGE} hover:bg-orange-700 text-white rounded-none h-10 px-4`}>
              <Search className="h-4 w-4" />
            </Button>
            
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchSuggestions.map((product) => (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.id}`}
                    onClick={() => {
                      setShowSuggestions(false);
                      setSearchTerm("");
                    }}
                  >
                    <div 
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                      data-testid={`navbar-suggestion-${product.id}`}
                    >
                      <img src={product.image} alt="" className="w-12 h-12 object-contain bg-slate-100 p-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.make} • {product.model}</div>
                      </div>
                      {isLoggedIn ? (
                        <div className="text-sm font-bold text-[#D97706]">AED {parseFloat(product.price).toLocaleString()}</div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Login for price</div>
                      )}
                    </div>
                  </Link>
                ))}
                <Link 
                  href={`/products?search=${encodeURIComponent(searchTerm)}`}
                  onClick={() => setShowSuggestions(false)}
                >
                  <div className="p-3 text-center text-sm text-[#D97706] font-medium hover:bg-slate-50 cursor-pointer">
                    View all results for "{searchTerm}"
                  </div>
                </Link>
              </div>
            )}
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 border border-slate-300 px-2 py-1 rounded-sm text-xs font-bold text-slate-700">
              <img src="https://flagcdn.com/w20/ae.png" className="w-5 h-3" alt="UAE" />
              <span>EN</span>
            </div>

            {isVendor && (
              <Link href="/seller/dashboard">
                <Button className={`${TOP_BAR_BG} text-white hover:bg-[#2A3324] font-bold text-xs uppercase h-9 rounded-full px-6`}>
                  Supplier Zone
                </Button>
              </Link>
            )}
            
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={`${BUTTON_ORANGE} text-white hover:bg-orange-700 font-bold text-xs uppercase h-9 rounded-full px-6`}>
                    <User className="h-4 w-4 mr-2" />
                    {user?.name?.split(' ')[0] || "Account"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button className={`${BUTTON_ORANGE} text-white hover:bg-orange-700 font-bold text-xs uppercase h-9 rounded-full px-6`}>
                  Login
                </Button>
              </Link>
            )}

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-[#D97706]">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#D97706] text-white text-[10px] w-4 h-4 rounded-full grid place-items-center font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu Trigger */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-600">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-6 mt-6">
                  <div className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                        <span className="text-sm font-medium py-2 block border-b border-slate-100 text-slate-700">
                          {link.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Nav - Dark Green */}
      <div className={`${TOP_BAR_BG} text-white hidden lg:block`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-[10px] font-medium tracking-wide">
            <div className="py-2.5 px-3 bg-[#D97706] cursor-pointer">
              <Menu className="h-3 w-3" />
            </div>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="hover:text-[#D97706] transition-colors py-2.5 cursor-pointer uppercase truncate px-2">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
