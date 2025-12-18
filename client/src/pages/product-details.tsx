import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { useRoute, Link } from "wouter";
import { 
  ShoppingCart, Heart, Truck, Shield, RotateCcw, 
  Star, Share2, Award, Box, FileText, CheckCircle2,
  AlertCircle, ChevronRight, Lock
} from "lucide-react";
import ProductCard from "@/components/ui/product-card";
import { useState } from "react";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const id = params ? parseInt(params.id) : 0;
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id)
  });

  const { data: similarProducts } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => api.getSimilarProducts(id),
    enabled: !!id
  });

  const { data: recommendedProducts } = useQuery({
    queryKey: ['recommended', id],
    queryFn: () => api.getRecommendedProducts(id),
    enabled: !!id
  });

  if (isLoading || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          Loading product details...
        </div>
      </Layout>
    );
  }

  const currentImage = activeImage || product.image;

  // Helper to render stars
  const renderStars = (rating: number = 0) => (
    <div className="flex text-yellow-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-current" : "text-muted-foreground/20"}`} 
        />
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="bg-slate-50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Gallery */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-[4/3] bg-white rounded-lg overflow-hidden border shadow-sm relative group">
                <img 
                  src={currentImage} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4"
                />
                <Button size="icon" variant="secondary" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div 
                  className={`aspect-square bg-white rounded-md cursor-pointer border-2 overflow-hidden ${currentImage === product.image ? "border-primary" : "border-transparent"}`}
                  onClick={() => setActiveImage(product.image)}
                >
                  <img src={product.image} className="w-full h-full object-cover" alt="Main" />
                </div>
                {product.gallery?.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`aspect-square bg-white rounded-md cursor-pointer border-2 overflow-hidden ${currentImage === img ? "border-primary" : "border-transparent"}`}
                    onClick={() => setActiveImage(img)}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* MIDDLE COLUMN: Product Info */}
            <div className="lg:col-span-4 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">{product.vendor}</span>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </div>
                
                <h1 className="text-2xl font-display font-bold mb-2 leading-tight text-slate-900">{product.name}</h1>
                
                <div className="flex items-center gap-2 mb-4">
                  {renderStars(product.rating)}
                  <span className="text-sm text-muted-foreground underline cursor-pointer">
                    {product.reviewCount || 0} reviews
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">{product.condition.toUpperCase()}</Badge>
                  <Badge variant="secondary" className="text-xs">
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </Badge>
                  {product.stock < 5 && product.stock > 0 && (
                    <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border space-y-4">
                <div className="flex items-baseline gap-3">
                  {product.price !== null ? (
                    <>
                      <span className="text-3xl font-bold text-slate-900">${product.price.toFixed(2)}</span>
                      {product.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xl font-medium text-slate-500 flex items-center gap-2">
                      <Lock className="h-5 w-5" /> Login to view price
                    </span>
                  )}
                </div>

                <Separator />
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>Free shipping on orders over $500</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>3 Year Warranty Included</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <RotateCcw className="h-4 w-4 text-green-600" />
                    <span>30-Day Money Back Guarantee</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {product.price !== null ? (
                  <div className="flex gap-3">
                    <Button size="lg" className="flex-1 font-bold h-12 text-base shadow-lg shadow-primary/20">
                      <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
                    </Button>
                    <Button size="lg" variant="secondary" className="font-bold h-12 text-base">
                      Buy Now
                    </Button>
                  </div>
                ) : (
                  <Link href="/auth/login" className="w-full">
                    <Button size="lg" className="w-full font-bold h-12 text-base">
                      Login to Purchase
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN: Seller & Offers */}
            <div className="lg:col-span-3 space-y-6">
              {/* Seller Card */}
              <div className="bg-white p-5 rounded-lg border shadow-sm">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Sold By</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                    {product.vendor.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{product.vendor}</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified Seller
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span>Member Since</span>
                    <span className="font-medium">{product.sellerInfo?.joinedDate || "2023"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Rate</span>
                    <span className="font-medium">{product.sellerInfo?.responseRate || "95%"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seller Rating</span>
                    <div className="flex items-center gap-1 font-medium">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {product.sellerInfo?.rating || 4.5}
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full text-xs h-8">
                  View Storefront
                </Button>
              </div>

              {/* Secure Transaction */}
              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Shield className="h-4 w-4" /> Secure Transaction
                </div>
                <p>Your transaction is secure. We work hard to protect your security and privacy.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* TABS SECTION: Specs, Fitment, Etc */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Product Details</TabsTrigger>
            <TabsTrigger value="fitment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Vehicle Fitment</TabsTrigger>
            <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Specifications</TabsTrigger>
            <TabsTrigger value="warranty" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Warranty</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Reviews</TabsTrigger>
          </TabsList>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              
              <TabsContent value="details" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-bold font-display mb-4">Description</h3>
                  <p className="text-slate-600 leading-relaxed">{product.description}</p>
                </div>
                
                {product.features && (
                  <div>
                    <h3 className="text-lg font-bold font-display mb-4">Key Features</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fitment" className="m-0 animate-in fade-in duration-300">
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b">
                    <h3 className="font-bold text-slate-800">Compatible Vehicles</h3>
                    <p className="text-xs text-muted-foreground mt-1">Please verify fitment with your specific VIN if unsure.</p>
                  </div>
                  {product.vehicleFitment ? (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(product.vehicleFitment).map(([make, models], idx) => (
                        <AccordionItem key={make} value={make} className="border-b-0 px-4">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <span className="font-semibold">{make}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4 pl-4">
                              {models.map((model, mIdx) => (
                                <li key={mIdx} className="text-sm text-slate-600 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                  {model}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>Universal Fitment or No specific vehicle data available.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="specs" className="m-0 animate-in fade-in duration-300">
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y">
                      {product.specifications ? (
                        Object.entries(product.specifications).map(([key, value], idx) => (
                          <tr key={key} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                            <td className="px-6 py-4 font-medium text-slate-600 w-1/3">{key}</td>
                            <td className="px-6 py-4 text-slate-900">{value}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-6 py-8 text-center text-muted-foreground" colSpan={2}>
                            No detailed specifications available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="warranty" className="m-0 animate-in fade-in duration-300">
                 <div className="bg-white border rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Warranty Coverage</h3>
                        <p className="text-primary font-medium">{product.warranty?.period || "Standard Manufacturer Warranty"}</p>
                      </div>
                    </div>
                    
                    {product.warranty?.details && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        {Object.entries(product.warranty.details).map(([key, value]) => (
                          <div key={key}>
                            <h4 className="text-sm font-bold text-slate-900 mb-1">{key}</h4>
                            <p className="text-sm text-slate-600">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="reviews" className="m-0 animate-in fade-in duration-300">
                <div className="space-y-6">
                  {/* Rating Summary */}
                  <div className="bg-slate-50 rounded-lg p-6 flex flex-col md:flex-row items-center gap-8">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-slate-900 mb-1">{product.rating}</div>
                      <div className="flex justify-center mb-2">{renderStars(product.rating)}</div>
                      <div className="text-sm text-muted-foreground">Based on {product.reviewCount} reviews</div>
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-3">
                          <div className="text-xs font-medium w-3">{stars}</div>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-400" 
                              style={{ width: stars === 5 ? '70%' : stars === 4 ? '20%' : '5%' }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Reviews List */}
                  <div className="space-y-6">
                    {product.reviews?.map((review) => (
                      <div key={review.id} className="border-b pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-slate-900">{review.user}</div>
                          <div className="text-xs text-muted-foreground">{review.date}</div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          {renderStars(review.rating)}
                          {review.verifiedPurchase && (
                            <span className="text-xs text-green-600 font-medium px-2 py-0.5 bg-green-50 rounded-full">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

            </div>

            {/* Sidebar Recommended */}
            <div className="lg:col-span-1 space-y-8">
               {/* Similar Items */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold font-display text-sm uppercase tracking-wider">Similar Items</h3>
                   <Link href="/products" className="text-xs text-primary hover:underline">View All</Link>
                 </div>
                 <div className="space-y-4">
                   {similarProducts?.map((item) => (
                     <div key={item.id} className="group flex gap-3 cursor-pointer">
                       <div className="w-16 h-16 bg-white border rounded-md overflow-hidden flex-shrink-0">
                         <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                       </div>
                       <div>
                         <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</h4>
                         <div className="text-xs text-muted-foreground mt-1">{item.vendor}</div>
                         <div className="font-bold text-sm mt-1">
                           {item.price !== null ? `$${item.price.toFixed(2)}` : <Lock className="h-3 w-3 inline" />}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <Separator />

               {/* Recommended for Vehicle */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold font-display text-sm uppercase tracking-wider">For Your {product.make}</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   {recommendedProducts?.map((item) => (
                     <div key={item.id} className="group cursor-pointer">
                       <div className="aspect-square bg-white border rounded-md overflow-hidden mb-2">
                         <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                       </div>
                       <h4 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</h4>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
