import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";
import { Link } from "wouter";

export default function Home() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-slate-900 py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
              The Premier <span className="text-primary">B2B Marketplace</span> for Auto Parts
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Connect with thousands of verified vendors. Source OEM and aftermarket parts with bulk pricing, instant quotes, and global shipping.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Search by Part #, VIN, or Keyword..." 
                  className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:bg-white/20"
                />
              </div>
              <Button size="lg" className="h-12 px-8 font-semibold text-base">
                Search Parts
              </Button>
            </div>

            <div className="flex gap-8 text-slate-400 text-sm font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Verified Vendors</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Instant Quotes</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <span>Global Shipping</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold">Popular Categories</h2>
            <Link href="/products">
              <Button variant="ghost" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories?.map((cat) => (
              <Link key={cat} href={`/products?category=${cat}`}>
                <div className="group cursor-pointer flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center h-full justify-center">
                  <div className="w-12 h-12 rounded-full bg-secondary grid place-items-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {/* Placeholder Icons based on text could go here */}
                    <span className="font-display font-bold text-lg">{cat[0]}</span>
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{cat}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold">Featured Products</h2>
            <Link href="/products">
              <Button variant="ghost" className="gap-2">
                Browse Marketplace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products?.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Grow Your Auto Parts Business?</h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8 text-lg">
            Join thousands of vendors and buyers on the world's most trusted automotive marketplace.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" variant="secondary" className="font-bold">
                Become a Vendor
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground">
                Register as Buyer
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
