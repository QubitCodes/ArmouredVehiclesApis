import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api, Product } from "@/lib/mockApi";
import { Filter, SlidersHorizontal, ChevronDown, ChevronRight, ChevronLeft, Star } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation, Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

  const { data: topSellingProducts } = useQuery({
     queryKey: ['topSellingProducts'],
     queryFn: api.getTopSellingProducts
  });

  const handleCategoryClick = (categoryId: number) => {
    setLocation(`/products?cat=${categoryId}`);
  };

  // Styles matching the dark/industrial theme
  const SECTION_TITLE = "font-bold text-[10px] uppercase text-slate-800 mb-2 tracking-wide";
  
  const FilterSidebar = () => (
    <div className="space-y-6 pr-4 bg-[#EFEBE4] min-h-screen">
      
      {/* Brand */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Brand</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
          {filterOptions?.brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox id={`brand-${brand}`} className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
              <label htmlFor={`brand-${brand}`} className="text-[10px] font-medium leading-none cursor-pointer text-slate-600 hover:text-black uppercase">
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Price */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Price</h3>
        <div className="flex items-center gap-2 mb-2">
           <span className="text-[10px] text-slate-600">AED 0 - AED 10000+</span>
        </div>
        <div className="relative h-1 bg-slate-300 w-full mb-4">
           <div className="absolute left-0 w-1/2 h-full bg-[#D97706]"></div>
           <div className="absolute left-0 -top-1 w-3 h-3 bg-[#D97706] rounded-full"></div>
           <div className="absolute left-1/2 -top-1 w-3 h-3 bg-[#D97706] rounded-full"></div>
        </div>
        <div className="flex gap-2">
            <Input type="number" placeholder="Min" className="h-6 text-[10px] rounded-none bg-white border-slate-300" />
            <Input type="number" placeholder="Max" className="h-6 text-[10px] rounded-none bg-white border-slate-300" />
        </div>
      </div>

      {/* Select Product Type (Visual) */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Select Product Type</h3>
        <div className="space-y-1">
          {filterOptions?.productTypes?.map((type, idx) => (
            <div key={idx} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors">
              <div className="w-8 h-8 bg-white border border-slate-200 p-0.5 flex items-center justify-center">
                <img src={type.image} alt={type.name} className="max-w-full max-h-full object-contain" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase">{type.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Department */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Select Department</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-600 cursor-pointer hover:text-[#D97706]">
             <span>Performance</span>
             <ChevronRight className="h-3 w-3" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-600 cursor-pointer hover:text-[#D97706]">
             <span>Replacement</span>
             <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Style */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Style</h3>
        <div className="space-y-1 pl-1">
           {["Plain (1387)", "Drilled (13)", "Slotted (4)", "Drilled & Slotted (2)"].map((style, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`style-${i}`} className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
                <label htmlFor={`style-${i}`} className="text-[10px] text-slate-600 uppercase cursor-pointer">{style}</label>
              </div>
           ))}
        </div>
      </div>

      {/* Surface Type */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Surface Type</h3>
        <div className="space-y-1 pl-1">
           {filterOptions?.surfaceTypes.map((type, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`surf-${i}`} className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
                <label htmlFor={`surf-${i}`} className="text-[10px] text-slate-600 uppercase cursor-pointer">{type}</label>
              </div>
           ))}
        </div>
      </div>

      {/* Material */}
      <div className="border-b border-slate-300 pb-4">
        <h3 className={SECTION_TITLE}>Friction Material Composition</h3>
        <div className="space-y-1 pl-1">
           {filterOptions?.frictionalMaterials.map((mat, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`mat-${i}`} className="rounded-none border-slate-400 h-3 w-3 data-[state=checked]:bg-[#3D4736] data-[state=checked]:border-[#3D4736]" />
                <label htmlFor={`mat-${i}`} className="text-[10px] text-slate-600 uppercase cursor-pointer">{mat}</label>
              </div>
           ))}
        </div>
      </div>

      {/* Banner Ad */}
      <div className="mt-8 bg-black p-4 text-center">
         <img src="https://via.placeholder.com/150x50?text=LOGO" className="h-6 mx-auto mb-4 invert" alt="Logo" />
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

  // New Product Card Design
  const ProductGridItem = ({ product }: { product: Product }) => (
    <div className="group relative bg-[#F5F5F5] border border-transparent hover:border-slate-300 transition-all p-4 flex flex-col h-full">
       {/* Favorite Icon */}
       <div className="absolute top-3 right-3 text-slate-300 cursor-pointer hover:text-red-500 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
       </div>
       
       {/* Image */}
       <div className="aspect-square mb-4 bg-transparent flex items-center justify-center p-2">
         <img 
           src={product.image} 
           alt={product.name} 
           className="max-w-full max-h-full object-contain mix-blend-multiply"
         />
       </div>

       {/* Content */}
       <div className="mt-auto">
         <h3 className="font-bold text-xs text-slate-800 mb-2 min-h-[2.5em] leading-tight line-clamp-2">
           {product.name}
         </h3>
         
         <div className="mb-4">
           {product.price ? (
             <div className="font-bold text-sm text-black">AED {product.price.toLocaleString()}</div>
           ) : (
             <div className="text-xs text-slate-500 italic">Login for Price</div>
           )}
           <div className="text-[10px] text-slate-400 mt-1">
             Sold by <span className="underline cursor-pointer hover:text-slate-600">{product.vendor}</span>
           </div>
         </div>

         {/* Full Width Button */}
         <Link href={`/products/${product.id}`}>
           <Button className={`w-full rounded-none font-bold text-xs uppercase h-9 ${product.actionType === 'inquiry' ? 'bg-[#D97706] text-white hover:bg-orange-700' : 'bg-[#D97706] text-white hover:bg-orange-700'}`}>
             {product.actionType === 'inquiry' ? 'SUBMIT AN INQUIRY' : 'ADD TO CART'}
           </Button>
         </Link>
       </div>
    </div>
  );

  return (
    <Layout>
      {/* Top Header Section */}
      <div className="bg-[#EFEBE4] border-b border-slate-200">
        <div className="container mx-auto px-4 py-8">
           <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-display font-black uppercase text-[#1A1A1A] mb-1 tracking-tight">
                  PERFORMANCE BRAKES
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-black">13871 Results</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-600">Sort By:</span>
                    <div className="border border-slate-300 bg-white px-3 py-1.5 min-w-[120px] flex justify-between items-center cursor-pointer">
                       <span className="text-xs font-bold">Best Match</span>
                       <ChevronDown className="h-3 w-3" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-[#EFEBE4] min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <FilterSidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              
              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
                {products?.map((product) => (
                  <ProductGridItem key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 mb-16">
                 <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-slate-300 bg-white text-slate-400 hover:text-black">
                    <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <Button className="h-8 w-8 rounded-none bg-[#3D4736] text-white font-bold text-xs hover:bg-[#2A3324]">1</Button>
                 <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-slate-300 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50">2</Button>
                 <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-slate-300 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50">3</Button>
                 <span className="text-slate-400 text-xs px-1">...</span>
                 <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-slate-300 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50">12</Button>
                 <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-slate-300 bg-white text-slate-400 hover:text-black">
                    <ChevronRight className="h-4 w-4" />
                 </Button>
              </div>

              {/* Recommended Section (Carousel) */}
              <div className="mb-16">
                 <h2 className="text-lg font-display font-bold uppercase text-[#1A1A1A] mb-6 border-l-4 border-[#1A1A1A] pl-3">
                   RECOMMENDED FOR YOU
                 </h2>
                 <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                    <CarouselContent className="-ml-4">
                       {topSellingProducts?.map((product) => (
                          <CarouselItem key={product.id} className="pl-4 basis-1/2 md:basis-1/4">
                             <div className="group cursor-pointer text-center bg-[#F5F5F5] p-4 border border-transparent hover:border-slate-300 transition-colors h-full">
                                <div className="aspect-square mb-3 flex items-center justify-center p-2 bg-white">
                                   <img src={product.image} className="max-w-full max-h-full object-contain" alt={product.name} />
                                </div>
                                <h3 className="text-[10px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 min-h-[2.5em]">
                                   {product.name}
                                </h3>
                                <div className="flex justify-center mt-2">
                                  {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-[#D97706] text-[#D97706]" />)}
                                  <span className="text-[9px] text-slate-500 ml-1">(120)</span>
                                </div>
                                <div className="text-[#D97706] text-xs font-bold mt-2 uppercase">BUY NOW</div>
                             </div>
                          </CarouselItem>
                       ))}
                    </CarouselContent>
                    <div className="flex justify-end gap-2 mt-4">
                      <CarouselPrevious className="static translate-y-0 h-6 w-6 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                      <CarouselNext className="static translate-y-0 h-6 w-6 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                    </div>
                 </Carousel>
              </div>
              
              {/* Bottom SEO Content Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-[10px] text-slate-600 leading-relaxed border-t border-slate-300 pt-12">
                 <div className="space-y-6">
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">ABOUT BRAKE PADS</h4>
                       <p>Ideally, brake pads should be replaced every 30,000 to 35,000 miles. However, the lifespan of brake pads varies greatly depending on the vehicle and driver. For example, if you often drive in heavy traffic in an urban area, you'll engage your brakes a lot more often than someone who drives in rural locations or on highways.</p>
                    </div>
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">WHY CHANGE YOUR BRAKE PADS?</h4>
                       <p>If your car takes longer to stop, there's squealing noises, or the brake pedal vibrates when you brake, it might be time to change your brake pads.</p>
                       <p className="mt-2">Brake pads are critical components of your car's braking system. Over time, friction material wears down, reducing stopping power. Driving with worn pads can damage your rotors and calipers, leading to more expensive repairs down the road.</p>
                    </div>
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">SIGNS OF WORN OR BAD BRAKE PADS</h4>
                       <ul className="list-disc pl-4 space-y-1">
                          <li>Squealing or screeching sounds when braking</li>
                          <li>Grinding metal sound (metal-on-metal contact)</li>
                          <li>Deep metallic growl or rumble (worn pads)</li>
                          <li>Pulsating brake pedal (warped rotors)</li>
                          <li>Longer stopping distances (faded brakes)</li>
                       </ul>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">WHAT ARE BRAKE PADS?</h4>
                       <p>Brake pads are a key component of your car's braking system that sit inside the brake caliper. They clamp down on the brake rotor (disc) to create friction that slows and stops your wheels.</p>
                    </div>
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">HOW OFTEN SHOULD BRAKE PADS BE REPLACED?</h4>
                       <p>Brake pads should be replaced as part of regular vehicle maintenance. As mentioned, driving habits and conditions play a huge role in how long they last. Consult your owner's manual for specific recommendations.</p>
                    </div>
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">HOW TO CHECK YOUR BRAKE PADS</h4>
                       <p>There are a few simple ways to check the condition of your brake pads:</p>
                       <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>Listen for sounds: Most pads have built-in wear indicators that make noise when it's time to change them.</li>
                          <li>Look at the pads through the wheel spokes: If the pad looks very thin (less than 1/4 inch), it needs replacement.</li>
                          <li>Check for dust: Excessive brake dust on wheels can indicate worn pads.</li>
                       </ul>
                    </div>
                    <div>
                       <h4 className="font-bold uppercase text-slate-800 mb-2">STOP SAFELY WITH ARMOREDMART</h4>
                       <p>Brake pads are one of the most important safety components on your vehicle. Don't wait until you hear grinding - replace worn pads early to maintain optimal performance and safety.</p>
                       <p className="mt-2">Shop confidently with ArmoredMart's high-quality brake pads. Reliable braking, vast selection, and fast delivery ensure you get back on the road safely. Browse our full inventory above.</p>
                    </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
