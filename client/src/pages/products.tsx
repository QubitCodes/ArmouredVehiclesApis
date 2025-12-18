import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import ProductCard from "@/components/ui/product-card";
import { Filter, SlidersHorizontal, Star, ChevronDown } from "lucide-react";
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

  const handleCategoryClick = (categoryId: number) => {
    setLocation(`/products?cat=${categoryId}`);
  };

  // Styles matching the dark/industrial theme
  const SECTION_TITLE = "font-bold text-xs uppercase text-slate-800 mb-3 tracking-wide";
  
  const FilterSidebar = () => (
    <div className="space-y-6 pr-4">
      {/* Categories */}
      <div>
        <h3 className={SECTION_TITLE}>Categories</h3>
        <div className="space-y-1">
          {categories?.map((cat) => (
            <div 
              key={cat.id} 
              className="flex items-center justify-between text-xs py-1 cursor-pointer hover:text-[#D97706] text-slate-600"
              onClick={() => handleCategoryClick(cat.id)}
            >
              <span>{cat.name}</span>
              <ChevronDown className="h-3 w-3 -rotate-90 opacity-50" />
            </div>
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* Price */}
      <div>
        <h3 className={SECTION_TITLE}>Price Range</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
            <Input type="number" placeholder="Min" className="h-8 pl-5 text-xs rounded-none" />
          </div>
          <span className="text-muted-foreground">-</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
            <Input type="number" placeholder="Max" className="h-8 pl-5 text-xs rounded-none" />
          </div>
        </div>
      </div>

      <Separator />
      
      {/* Brands */}
      <div>
        <h3 className={SECTION_TITLE}>Brand</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {filterOptions?.brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox id={`brand-${brand}`} className="rounded-none border-slate-300 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
              <label htmlFor={`brand-${brand}`} className="text-xs font-medium leading-none cursor-pointer text-slate-600 hover:text-black">
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Ratings */}
      <div>
        <h3 className={SECTION_TITLE}>Customer Ratings</h3>
        <div className="space-y-2">
          {[5, 4, 3].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox id={`rating-${rating}`} className="rounded-none border-slate-300 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
              <label htmlFor={`rating-${rating}`} className="text-xs font-medium leading-none flex items-center gap-1 cursor-pointer text-slate-600">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3 w-3 ${i < rating ? "fill-[#D97706] text-[#D97706]" : "text-slate-200"}`} 
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">& Up</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      {/* Breadcrumb Header */}
      <div className="bg-[#EFEBE4] border-b border-orange-200/50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-display font-bold uppercase text-[#3D4736]">
            Marketplace
          </h1>
          <p className="text-xs text-slate-500 mt-1">Browse defence-grade parts and systems.</p>
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
            <div className="flex items-center justify-between mb-6 bg-white p-3 border border-slate-100 rounded-sm">
              <div className="text-xs text-muted-foreground font-medium">
                Showing <span className="text-black font-bold">{products?.length || 0}</span> results
              </div>
              
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-2 h-8 text-xs rounded-none">
                      <Filter className="h-3 w-3" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] overflow-y-auto">
                    <div className="mt-6">
                      <FilterSidebar />
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs rounded-none border-slate-200 hover:bg-slate-50">
                  <SlidersHorizontal className="h-3 w-3" /> Sort: Featured
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
