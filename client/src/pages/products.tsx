import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Product } from "@shared/schema";
import { Filter, SlidersHorizontal, ChevronDown, ChevronRight, ChevronLeft, Star, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation, Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function ProductsPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSurfaceTypes, setSelectedSurfaceTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("best");

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.getAll()
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: api.filters.get
  });

  const { data: topSellingProducts } = useQuery({
    queryKey: ['topSellingProducts'],
    queryFn: api.products.getTopSelling
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let result = [...products];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.make?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term)
      );
    }

    if (selectedBrands.length > 0) {
      result = result.filter(p => p.make && selectedBrands.includes(p.make));
    }

    if (selectedDepartments.length > 0) {
      result = result.filter(p => p.department && selectedDepartments.includes(p.department));
    }

    if (minPrice) {
      result = result.filter(p => parseFloat(p.price) >= parseFloat(minPrice));
    }

    if (maxPrice) {
      result = result.filter(p => parseFloat(p.price) <= parseFloat(maxPrice));
    }

    if (sortBy === "price_low") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price_high") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, searchTerm, selectedBrands, selectedDepartments, minPrice, maxPrice, sortBy]);

  const searchSuggestions = useMemo(() => {
    if (!products || !searchTerm.trim() || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [products, searchTerm]);

  const uniqueDepartments = useMemo(() => {
    if (!products) return [];
    const depts = products.map(p => p.department).filter(Boolean) as string[];
    return Array.from(new Set(depts));
  }, [products]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedBrands([]);
    setSelectedDepartments([]);
    setSelectedMaterials([]);
    setSelectedSurfaceTypes([]);
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters = searchTerm || selectedBrands.length > 0 || selectedDepartments.length > 0 || minPrice || maxPrice;

  const SECTION_TITLE = "font-bold text-[10px] uppercase text-slate-800 mb-2 tracking-wide";
  
  const FilterSidebar = () => (
    <div className="space-y-6 pr-4 bg-[#EFEBE4] min-h-screen">
      
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearFilters}
          className="w-full rounded-none text-xs border-slate-400"
          data-testid="button-clear-filters"
        >
          <X className="h-3 w-3 mr-1" /> Clear All Filters
        </Button>
      )}

      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Brand</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
          {filterOptions?.brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox 
                id={`brand-${brand}`} 
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
                className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" 
                data-testid={`checkbox-brand-${brand}`}
              />
              <label htmlFor={`brand-${brand}`} className="text-[10px] font-medium leading-none cursor-pointer text-slate-600 hover:text-black uppercase">
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Price (AED)</h3>
        <div className="flex gap-2">
          <Input 
            type="number" 
            placeholder="Min" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-6 text-[10px] rounded-none bg-white border-slate-300" 
            data-testid="input-min-price"
          />
          <Input 
            type="number" 
            placeholder="Max" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-6 text-[10px] rounded-none bg-white border-slate-300" 
            data-testid="input-max-price"
          />
        </div>
      </div>

      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Department</h3>
        <div className="space-y-1">
          {uniqueDepartments.map((dept) => (
            <div key={dept} className="flex items-center space-x-2">
              <Checkbox 
                id={`dept-${dept}`} 
                checked={selectedDepartments.includes(dept!)}
                onCheckedChange={() => toggleDepartment(dept!)}
                className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" 
                data-testid={`checkbox-dept-${dept}`}
              />
              <label htmlFor={`dept-${dept}`} className="text-[10px] font-medium leading-none cursor-pointer text-slate-600 hover:text-black uppercase">
                {dept}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Surface Type</h3>
        <div className="space-y-1 pl-1">
          {filterOptions?.surfaceTypes.map((type, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox 
                id={`surf-${i}`} 
                checked={selectedSurfaceTypes.includes(type)}
                onCheckedChange={() => setSelectedSurfaceTypes(prev => 
                  prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                )}
                className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" 
                data-testid={`checkbox-surface-${type}`}
              />
              <label htmlFor={`surf-${i}`} className="text-[10px] text-slate-600 uppercase cursor-pointer">{type}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Friction Material</h3>
        <div className="space-y-1 pl-1">
          {filterOptions?.frictionalMaterials.map((mat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox 
                id={`mat-${i}`} 
                checked={selectedMaterials.includes(mat)}
                onCheckedChange={() => setSelectedMaterials(prev => 
                  prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
                )}
                className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" 
                data-testid={`checkbox-material-${mat}`}
              />
              <label htmlFor={`mat-${i}`} className="text-[10px] text-slate-600 uppercase cursor-pointer">{mat}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 bg-black p-4 text-center">
        <div className="aspect-square bg-slate-800 mb-4 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=300" className="w-full h-full object-cover opacity-80" alt="Ad" />
        </div>
        <h4 className="text-white font-bold text-lg uppercase mb-1">VIZZ 550 RGB</h4>
        <p className="text-slate-400 text-[10px] mb-4">Specialty Color Waterproof Headlamp</p>
        <Button className="w-full bg-[#D97706] hover:bg-orange-700 text-white font-bold text-xs rounded-none uppercase">
          SHOP NOW
        </Button>
      </div>
    </div>
  );

  const ProductGridItem = ({ product }: { product: Product }) => (
    <div className="group relative bg-[#F5F5F5] border border-transparent hover:border-slate-300 transition-all p-4 flex flex-col h-full" data-testid={`card-product-${product.id}`}>
      <div className="absolute top-3 right-3 text-slate-300 cursor-pointer hover:text-red-500 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
      
      <div className="aspect-square mb-4 bg-transparent flex items-center justify-center p-2">
        <img 
          src={product.image} 
          alt={product.name} 
          className="max-w-full max-h-full object-contain mix-blend-multiply"
        />
      </div>

      <div className="mt-auto">
        <h3 className="font-bold text-xs text-slate-800 mb-2 min-h-[2.5em] leading-tight line-clamp-2">
          {product.name}
        </h3>
        
        <div className="mb-4">
          {product.price ? (
            <div className="font-bold text-sm text-black">AED {parseFloat(product.price.toString()).toLocaleString()}</div>
          ) : (
            <div className="text-xs text-slate-500 italic">Login for Price</div>
          )}
          <div className="text-[10px] text-slate-400 mt-1">
            Sold by <span className="underline cursor-pointer hover:text-slate-600">{product.make || 'Vendor'}</span>
          </div>
        </div>

        <Link href={`/products/${product.id}`}>
          <Button 
            className={`w-full rounded-none font-bold text-xs uppercase h-9 bg-[#D97706] text-white hover:bg-orange-700`}
            data-testid={`button-add-cart-${product.id}`}
          >
            {product.actionType === 'inquiry' ? 'SUBMIT AN INQUIRY' : 'ADD TO CART'}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="bg-[#EFEBE4] border-b border-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-black uppercase text-[#1A1A1A] mb-1 tracking-tight">
                {searchTerm ? `SEARCH: "${searchTerm}"` : 'ALL PRODUCTS'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-black">{filteredProducts.length} Results</span>
                {hasActiveFilters && <span className="text-orange-600">• Filters applied</span>}
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="h-9 text-sm rounded-none border-slate-300 pr-10"
                  data-testid="input-search-products"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-lg z-50 max-h-64 overflow-y-auto">
                    {searchSuggestions.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/products/${product.id}`}
                        onClick={() => setShowSuggestions(false)}
                      >
                        <div 
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                          data-testid={`suggestion-${product.id}`}
                        >
                          <img src={product.image} alt="" className="w-10 h-10 object-contain" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate">{product.name}</div>
                            <div className="text-[10px] text-slate-500">SKU: {product.sku}</div>
                          </div>
                          <div className="text-xs font-bold text-orange-600">AED {parseFloat(product.price).toLocaleString()}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-600 hidden md:inline">Sort:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold cursor-pointer rounded-none"
                  data-testid="select-sort"
                >
                  <option value="best">Best Match</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#EFEBE4] min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <FilterSidebar />
            </aside>

            <div className="flex-1">
              
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-slate-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">No products found</h3>
                  <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
                  <Button onClick={clearFilters} className="bg-[#D97706] hover:bg-orange-700" data-testid="button-clear-search">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
                  {filteredProducts.map((product) => (
                    <ProductGridItem key={product.id} product={product} />
                  ))}
                </div>
              )}

              {topSellingProducts && topSellingProducts.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-lg font-display font-bold uppercase text-[#1A1A1A] mb-6 border-l-4 border-[#1A1A1A] pl-3">
                    RECOMMENDED FOR YOU
                  </h2>
                  <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                    <CarouselContent className="-ml-4">
                      {topSellingProducts?.map((product) => (
                        <CarouselItem key={product.id} className="pl-4 basis-1/2 md:basis-1/4">
                          <Link href={`/products/${product.id}`}>
                            <div className="group cursor-pointer text-center bg-[#F5F5F5] p-4 border border-transparent hover:border-slate-300 transition-colors h-full">
                              <div className="aspect-square mb-3 flex items-center justify-center p-2 bg-white">
                                <img src={product.image} className="max-w-full max-h-full object-contain" alt={product.name} />
                              </div>
                              <h3 className="text-[10px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 min-h-[2.5em]">
                                {product.name}
                              </h3>
                              <div className="flex justify-center mt-2">
                                {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-[#D97706] text-[#D97706]" />)}
                                <span className="text-[9px] text-slate-500 ml-1">({product.reviewCount || 0})</span>
                              </div>
                              <div className="text-[#D97706] text-xs font-bold mt-2 uppercase">BUY NOW</div>
                            </div>
                          </Link>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <div className="flex justify-end gap-2 mt-4">
                      <CarouselPrevious className="static translate-y-0 h-6 w-6 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                      <CarouselNext className="static translate-y-0 h-6 w-6 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                    </div>
                  </Carousel>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
