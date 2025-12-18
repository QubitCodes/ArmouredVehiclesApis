import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { Link } from "wouter";
import { ArrowRight, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Product } from "@/lib/mockApi";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function Home() {
  const { data: slides } = useQuery({ queryKey: ['slides'], queryFn: api.getSlides });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.getCategories });
  const { data: featuredProducts } = useQuery({ queryKey: ['featuredProducts'], queryFn: api.getFeaturedProducts });
  const { data: topSellingProducts } = useQuery({ queryKey: ['topSellingProducts'], queryFn: api.getTopSellingProducts });

  if (!slides || !categories || !featuredProducts || !topSellingProducts) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D97706]" />
        </div>
      </Layout>
    );
  }

  // Helper for Featured Product Card (Dark Theme)
  const FeaturedCard = ({ product }: { product: Product }) => (
    <div className="group relative border border-slate-700 bg-[#1A1A1A] p-4 flex flex-col h-full hover:border-[#D97706] transition-colors">
      <div className="aspect-[4/3] w-full overflow-hidden mb-4 bg-black/20 flex items-center justify-center">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="mt-auto">
        <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{product.name}</h3>
        <div className="text-slate-400 text-xs mb-4">
          {product.price ? `AED ${product.price.toLocaleString()}` : 'Login for Price'}
        </div>
        <Link href={`/products/${product.id}`}>
          <Button className={`w-full h-9 text-xs font-bold uppercase rounded-none ${product.actionType === 'inquiry' ? 'bg-white text-black hover:bg-slate-200' : 'bg-white text-black hover:bg-[#D97706] hover:text-white'}`}>
            {product.actionType === 'inquiry' ? 'SUBMIT INQUIRY' : 'BUY NOW'}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <Layout>
      {/* 1. Hero Section - Dark & Industrial Carousel */}
      <section className="relative bg-black h-[500px] overflow-hidden group">
        <Carousel 
          className="w-full h-full"
          plugins={[Autoplay({ delay: 5000 })]}
          opts={{ loop: true }}
        >
          <CarouselContent className="h-full ml-0">
            {slides.map((slide) => (
              <CarouselItem key={slide.id} className="pl-0 relative h-[500px]">
                <div className="absolute inset-0">
                  <img 
                    src={slide.image} 
                    className="w-full h-full object-cover opacity-40" 
                    alt="Armored Vehicle"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                </div>
                
                <div className="container mx-auto px-4 h-full flex items-center relative z-10">
                  <div className="max-w-xl">
                    <h1 className="text-5xl lg:text-6xl font-display font-bold text-[#D97706] leading-tight mb-2 uppercase">
                      {slide.title || "DEFENCE COMMERCE, REINVENTED."}
                    </h1>
                    <p className="text-lg text-slate-300 mb-8 font-light">
                      {slide.subtitle || "Built for Security. Powered by Compliance."}
                    </p>
                    <Link href={slide.link}>
                      <Button className="bg-[#D97706] hover:bg-orange-700 text-white font-bold uppercase rounded-none h-12 px-8">
                        {slide.buttonText}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CarouselItem>
            ))}
            {/* Fallback slide if array is empty or for demo */}
            {slides.length === 0 && (
               <CarouselItem className="pl-0 relative h-[500px]">
                  {/* ... same content as above ... */}
               </CarouselItem>
            )}
          </CarouselContent>
          <div className="absolute bottom-8 right-8 flex gap-2">
            <CarouselPrevious className="static translate-y-0 h-10 w-10 border-slate-600 bg-black/50 hover:bg-[#D97706] hover:text-white hover:border-[#D97706] rounded-none text-slate-300" />
            <CarouselNext className="static translate-y-0 h-10 w-10 border-slate-600 bg-black/50 hover:bg-[#D97706] hover:text-white hover:border-[#D97706] rounded-none text-slate-300" />
          </div>
        </Carousel>
      </section>

      {/* 2. Categories Carousel - Industrial Cards */}
      <section className="py-16 bg-[#2A2A2A]">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8 border-b border-slate-700 pb-4">
            <h2 className="text-2xl font-display font-bold text-white uppercase border-l-4 border-[#D97706] pl-4">
              CATEGORIES
            </h2>
          </div>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {categories.map((cat) => (
                <CarouselItem key={cat.id} className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                  <Link href={`/products?cat=${cat.id}`}>
                    <div className="group cursor-pointer">
                      <div className="aspect-square bg-slate-800 relative overflow-hidden mb-3 border border-transparent group-hover:border-[#D97706] transition-colors">
                        <img 
                          src={cat.image} 
                          alt={cat.name}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        />
                      </div>
                      <h3 className="text-slate-300 text-xs font-bold uppercase group-hover:text-white leading-tight min-h-[2.5em]">
                        {cat.name}
                      </h3>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-6">
               <CarouselPrevious className="static translate-y-0 h-8 w-8 border-slate-600 bg-transparent hover:bg-[#D97706] hover:text-white hover:border-[#D97706] rounded-none text-slate-400" />
               <CarouselNext className="static translate-y-0 h-8 w-8 border-slate-600 bg-transparent hover:bg-[#D97706] hover:text-white hover:border-[#D97706] rounded-none text-slate-400" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* 3. Featured Products Carousel - Dark Theme */}
      <section className="py-16 bg-[#1A1A1A] border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-display font-bold text-white uppercase border-l-4 border-white pl-4">
              FEATURED PRODUCTS
            </h2>
          </div>

          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {featuredProducts.map((product) => (
                <CarouselItem key={product.id} className="pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <FeaturedCard product={product} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-8 gap-2">
               <CarouselPrevious className="static translate-y-0 h-8 w-8 border-slate-600 bg-transparent hover:bg-white hover:text-black hover:border-white rounded-none text-slate-400" />
               <div className="w-8 h-1 bg-[#D97706] self-center" />
               <div className="w-8 h-1 bg-slate-700 self-center" />
               <CarouselNext className="static translate-y-0 h-8 w-8 border-slate-600 bg-transparent hover:bg-white hover:text-black hover:border-white rounded-none text-slate-400" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* 4. Top Selling - Light Beige Theme */}
      <section className="py-16 bg-[#EFEBE4]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Product Carousel Grid */}
            <div>
              <div className="flex justify-between items-center mb-8 border-l-4 border-[#1A1A1A] pl-4">
                <h2 className="text-2xl font-display font-bold text-[#1A1A1A] uppercase">
                  TOP SELLING PRODUCTS
                </h2>
              </div>
              
              <Carousel className="w-full">
                <CarouselContent>
                  {/* Slide 1 - Grid of 6 */}
                  <CarouselItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8">
                      {topSellingProducts.slice(0, 6).map((product) => (
                        <Link key={product.id} href={`/products/${product.id}`}>
                          <div className="group cursor-pointer text-center">
                            <div className="aspect-square bg-white border border-slate-200 mb-3 p-2 group-hover:border-[#D97706] transition-colors">
                              <img src={product.image} className="w-full h-full object-contain" alt={product.name} />
                            </div>
                            <h3 className="text-[10px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 h-8">
                              {product.name}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CarouselItem>
                  {/* Slide 2 - Next set (simulated by repeating for now if not enough data) */}
                   <CarouselItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8">
                      {topSellingProducts.slice(0, 6).map((product) => (
                        <Link key={`dup-${product.id}`} href={`/products/${product.id}`}>
                          <div className="group cursor-pointer text-center">
                            <div className="aspect-square bg-white border border-slate-200 mb-3 p-2 group-hover:border-[#D97706] transition-colors">
                              <img src={product.image} className="w-full h-full object-contain" alt={product.name} />
                            </div>
                            <h3 className="text-[10px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 h-8">
                              {product.name}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <div className="flex justify-center gap-2 mt-6">
                  <CarouselPrevious className="static translate-y-0 h-8 w-8 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                  <CarouselNext className="static translate-y-0 h-8 w-8 border-slate-300 bg-transparent hover:bg-[#1A1A1A] hover:text-white rounded-none text-slate-500" />
                </div>
              </Carousel>
            </div>

            {/* Right: Featured Highlight */}
            <div className="relative h-full min-h-[400px] bg-slate-200 overflow-hidden group cursor-pointer">
               <img 
                 src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800" 
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                 alt="Highlight"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
               <div className="absolute bottom-8 left-8 right-8 text-center">
                 <h3 className="text-2xl font-bold text-white mb-2">Turbochargers & Superchargers</h3>
                 <div className="flex justify-center items-center gap-2 text-[#D97706] text-sm mb-4">
                   <span>★★★★★</span>
                   <span className="text-slate-300">(2083)</span>
                 </div>
                 <Button className="bg-white text-[#D97706] hover:bg-[#D97706] hover:text-white font-bold uppercase h-10 px-8 rounded-none">
                   BUY NOW
                 </Button>
               </div>
               
               {/* Navigation Arrows Mockup */}
               <div className="absolute top-1/2 -translate-y-1/2 left-4 text-white/50 hover:text-white cursor-pointer transition-colors hover:scale-110">
                 <ChevronLeft className="h-8 w-8" />
               </div>
               <div className="absolute top-1/2 -translate-y-1/2 right-4 text-white/50 hover:text-white cursor-pointer transition-colors hover:scale-110">
                 <ChevronRight className="h-8 w-8" />
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sponsored Ad Banner */}
      <section className="bg-[#1A1A1A] py-8 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="bg-black border border-slate-700 p-1 flex items-center justify-between">
             <div className="bg-white px-6 py-4">
               <img src="https://via.placeholder.com/150x40?text=LOGO" alt="Brand Logo" className="h-8 opacity-80" />
             </div>
             <div className="flex-1 px-8 flex items-center gap-4">
               <img src="https://via.placeholder.com/60x60?text=ITEM" alt="Item" className="h-12 w-12 rounded border border-slate-600" />
               <div>
                 <h3 className="text-white font-bold text-lg uppercase tracking-wider">VIZZ 550 RGB</h3>
                 <p className="text-slate-400 text-xs">Specialty Color Waterproof Headlamp</p>
               </div>
             </div>
             <Button className="bg-[#D97706] text-white hover:bg-orange-700 font-bold uppercase rounded-none mr-4">
               SHOP NOW
             </Button>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">
            Disclaimer: This is a sponsored content. ArmoredMart assumes no responsibility...
          </p>
        </div>
      </section>

      {/* Trust Badges - Dark */}
      <section className="bg-[#2A2A2A] py-12 border-t border-slate-700">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border border-slate-500 rounded flex items-center justify-center mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h4 className="text-white font-bold uppercase text-sm mb-1">Compliance Built In</h4>
            <p className="text-slate-500 text-xs">Global standards. Automatic protection.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border border-slate-500 rounded flex items-center justify-center mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h4 className="text-white font-bold uppercase text-sm mb-1">Secure Commerce Platform</h4>
            <p className="text-slate-500 text-xs">Every transaction, fully encrypted.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border border-slate-500 rounded flex items-center justify-center mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h4 className="text-white font-bold uppercase text-sm mb-1">Verified Sellers & Buyers</h4>
            <p className="text-slate-500 text-xs">Only trusted partners allowed.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
