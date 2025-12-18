import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";
import { Filter, SlidersHorizontal, Star } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "wouter";

export default function ProductsPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const activeCategory = searchParams.get("category");

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: api.getFilters
  });

  const handleCategoryClick = (categoryName: string) => {
    if (activeCategory === categoryName) {
      setLocation("/products");
    } else {
      setLocation(`/products?category=${categoryName}`);
    }
  };

  const FilterSidebar = () => (
    <div className="space-y-6 pr-4">
      {/* 3. Category (Button Link UI) */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories?.map((cat) => (
            <Button 
              key={cat.id} 
              variant={activeCategory === cat.name ? "default" : "outline"} 
              size="sm"
              onClick={() => handleCategoryClick(cat.name)}
              className="rounded-full text-xs h-8"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* 1. Brand */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Brand</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {filterOptions?.brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox id={`brand-${brand}`} />
              <label htmlFor={`brand-${brand}`} className="text-sm font-medium leading-none cursor-pointer">
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />
      
      {/* 2. Price */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Price Range</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
            <Input type="number" placeholder="Min" className="h-9 pl-5 text-sm" />
          </div>
          <span className="text-muted-foreground">-</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
            <Input type="number" placeholder="Max" className="h-9 pl-5 text-sm" />
          </div>
        </div>
      </div>

      <Separator />

      {/* 4. Department */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Department</h3>
        <div className="space-y-2">
          {filterOptions?.departments.map((dept) => (
            <div key={dept} className="flex items-center space-x-2">
              <Checkbox id={`dept-${dept}`} />
              <label htmlFor={`dept-${dept}`} className="text-sm font-medium leading-none cursor-pointer">
                {dept}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 5. Rating */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Customer Ratings</h3>
        <div className="space-y-2">
          {[5, 4, 3].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox id={`rating-${rating}`} />
              <label htmlFor={`rating-${rating}`} className="text-sm font-medium leading-none flex items-center gap-1 cursor-pointer">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3 w-3 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} 
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">& Up</span>
              </label>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <Checkbox id="rating-0" />
            <label htmlFor="rating-0" className="text-sm font-medium leading-none cursor-pointer">
              No Rating
            </label>
          </div>
        </div>
      </div>

      <Separator />

      {/* 6. Surface Type */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Surface Type</h3>
        <div className="space-y-2">
          {filterOptions?.surfaceTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox id={`surface-${type}`} />
              <label htmlFor={`surface-${type}`} className="text-sm font-medium leading-none cursor-pointer">
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 7. Frictional Material Composition */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Material</h3>
        <div className="space-y-2">
          {filterOptions?.frictionalMaterials.map((mat) => (
            <div key={mat} className="flex items-center space-x-2">
              <Checkbox id={`mat-${mat}`} />
              <label htmlFor={`mat-${mat}`} className="text-sm font-medium leading-none cursor-pointer">
                {mat}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 8. Abutment Clips Included */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Abutment Clips Included</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="clips-yes" />
            <label htmlFor="clips-yes" className="text-sm font-medium leading-none cursor-pointer">Yes</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="clips-no" />
            <label htmlFor="clips-no" className="text-sm font-medium leading-none cursor-pointer">No</label>
          </div>
        </div>
      </div>

      <Separator />

      {/* 9. Brake Lubricant Included */}
      <div>
        <h3 className="font-display font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Brake Lubricant Included</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="lube-yes" />
            <label htmlFor="lube-yes" className="text-sm font-medium leading-none cursor-pointer">Yes</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="lube-no" />
            <label htmlFor="lube-no" className="text-sm font-medium leading-none cursor-pointer">No</label>
          </div>
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
                  <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
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
