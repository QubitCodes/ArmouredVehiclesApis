import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";
import { Link } from "wouter";
import HeroSlider from "@/components/home/HeroSlider";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const { data: slides } = useQuery({
    queryKey: ['slides'],
    queryFn: api.getSlides
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: api.getFeaturedProducts
  });

  const { data: topSellingProducts } = useQuery({
    queryKey: ['topSellingProducts'],
    queryFn: api.getTopSellingProducts
  });

  if (!slides || !categories || !featuredProducts || !topSellingProducts) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* 1. Hero Slider Section */}
      <HeroSlider slides={slides} />

      {/* 2. Categories List Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl lg:text-3xl font-display font-bold">Shop by Category</h2>
            <Link href="/products">
              <Button variant="ghost" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.name}`}>
                <div className="group cursor-pointer flex flex-col gap-3">
                  <div className="aspect-square overflow-hidden rounded-lg border bg-secondary relative">
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-lg group-hover:text-primary transition-colors">{cat.name}</h3>
                    {/* Description is hidden as per requirements */}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Products Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl lg:text-3xl font-display font-bold">Featured Products</h2>
            <Link href="/products">
              <Button variant="outline" className="gap-2">
                Browse Marketplace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Top Selling Products Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl lg:text-3xl font-display font-bold">Top Selling Products</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topSellingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">Join the AutoParts Network</h2>
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8 text-lg">
            Whether you're a vendor looking to expand your reach or a workshop seeking reliable parts, we have the solution for you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" variant="secondary" className="font-bold h-14 px-8 text-lg">
                Become a Vendor
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground h-14 px-8 text-lg">
                Register as Buyer
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
