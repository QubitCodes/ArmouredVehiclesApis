import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Marketplace" },
    { href: "/seller/dashboard", label: "Sell on AutoParts" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1 rounded-sm">
            <div className="w-6 h-6 border-2 border-current rounded-sm grid place-items-center">
              <span className="text-xs font-bold font-display">AP</span>
            </div>
          </div>
          <span className="text-xl font-bold font-display tracking-tight hidden sm:inline-block">
            AutoParts<span className="text-primary">.B2B</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={`text-sm font-medium transition-colors hover:text-primary ${
                location === link.href ? "text-primary" : "text-muted-foreground"
              }`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Part Number, VIN, or Keyword..."
            className="w-full pl-9 bg-secondary/50 border-secondary focus-visible:bg-background transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full grid place-items-center font-bold">
                2
              </span>
            </Button>
          </Link>
          
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
              <User className="h-4 w-4" />
              <span>Login</span>
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 mt-6">
                <div className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                      <span className={`text-lg font-medium ${
                        location === link.href ? "text-primary" : "text-foreground"
                      }`}>
                        {link.label}
                      </span>
                    </Link>
                  ))}
                  <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                    <span className="text-lg font-medium">Login / Register</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
