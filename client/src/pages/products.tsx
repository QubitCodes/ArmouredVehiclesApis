import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";
import { Filter, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function ProductsPage() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories
  });

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold mb-4">Categories</h3>
        <div className="space-y-2">
          {categories?.map((cat) => (
            <div key={cat} className="flex items-center space-x-2">
              <Checkbox id={`cat-${cat}`} />
              <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {cat}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h3 className="font-display font-bold mb-4">Price Range</h3>
        <Slider defaultValue={[0, 1000]} max={2000} step={10} className="mb-4" />
        <div className="flex items-center gap-4">
          <Input type="number" placeholder="Min" className="h-8" />
          <span className="text-muted-foreground">-</span>
          <Input type="number" placeholder="Max" className="h-8" />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display font-bold mb-4">Condition</h3>
        <div className="space-y-2">
          {['New', 'Used', 'Refurbished'].map((cond) => (
            <div key={cond} className="flex items-center space-x-2">
              <Checkbox id={`cond-${cond}`} />
              <label htmlFor={`cond-${cond}`} className="text-sm font-medium leading-none">
                {cond}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="bg-slate-50 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Browse thousands of parts from verified vendors.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                Showing {products?.length || 0} results
              </div>
              
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <div className="mt-6">
                      <FilterSidebar />
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Sort
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
