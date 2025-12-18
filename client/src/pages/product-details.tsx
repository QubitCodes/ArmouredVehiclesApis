import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRoute, Link, useLocation } from "wouter";
import { 
  ShoppingCart, Heart, Truck, Shield, RotateCcw, 
  Star, Share2, Award, CheckCircle2,
  AlertCircle, Lock, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.getById(id)
  });

  const { data: similarProducts } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => api.products.getSimilar(id),
    enabled: !!id
  });

  const { data: recommendedProducts } = useQuery({
    queryKey: ['recommended', id],
    queryFn: () => api.products.getRecommended(id),
    enabled: !!id
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: number) => api.cart.add(productId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: "Added to cart!",
        description: "Product has been added to your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Please log in to add items to cart.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to cart.",
      });
      setLocation('/auth/login');
      return;
    }
    addToCartMutation.mutate(id);
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to wishlist.",
      });
      setLocation('/auth/login');
      return;
    }
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (wishlist.includes(id)) {
      toast({
        title: "Already in wishlist",
        description: "This product is already in your wishlist.",
      });
      return;
    }
    wishlist.push(id);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    toast({
      title: "Added to wishlist!",
      description: "Product has been added to your wishlist.",
    });
  };

  if (isLoading || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600" />
          <p className="mt-4 text-slate-500">Loading product details...</p>
        </div>
      </Layout>
    );
  }

  const currentImage = activeImage || product.image;
  const specifications = product.specifications ? JSON.parse(product.specifications) : null;
  const vehicleFitment = product.vehicleFitment ? JSON.parse(product.vehicleFitment) : null;
  const warranty = product.warranty ? JSON.parse(product.warranty) : null;

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

            <div className="lg:col-span-4 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">{product.make}</span>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </div>
                
                <h1 className="text-2xl font-display font-bold mb-2 leading-tight text-slate-900">{product.name}</h1>
                
                <div className="flex items-center gap-2 mb-4">
                  {renderStars(parseFloat(product.rating || "0"))}
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
                {isAuthenticated ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-slate-900">AED {parseFloat(product.price).toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">AED {parseFloat(product.originalPrice).toLocaleString()}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Lock className="h-4 w-4" />
                    <span className="text-lg font-medium">Login to see price</span>
                  </div>
                )}

                <Separator />
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>Free shipping on orders over AED 500</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Warranty Included</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <RotateCcw className="h-4 w-4 text-green-600" />
                    <span>30-Day Return Policy</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isAuthenticated ? (
                  <Button 
                    size="lg" 
                    className="w-full font-bold h-12 text-base shadow-lg shadow-primary/20 bg-orange-600 hover:bg-orange-700"
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isPending || product.stock === 0}
                    data-testid="button-add-to-cart"
                  >
                    {addToCartMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 mr-2" />
                    )}
                    Add to Cart
                  </Button>
                ) : (
                  <Link href="/auth/login">
                    <Button 
                      size="lg" 
                      className="w-full font-bold h-12 text-base shadow-lg shadow-primary/20 bg-orange-600 hover:bg-orange-700"
                      data-testid="button-login-to-buy"
                    >
                      <Lock className="h-5 w-5 mr-2" />
                      Login to Purchase
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleAddToWishlist}>
                  <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 rounded-lg border shadow-sm">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Sold By</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                    {product.make.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{product.make}</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified Seller
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span>Vehicle</span>
                    <span className="font-medium">{product.make} {product.model} {product.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition</span>
                    <span className="font-medium capitalize">{product.condition}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full text-xs h-8">
                  View Storefront
                </Button>
              </div>

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

      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Product Details</TabsTrigger>
            <TabsTrigger value="fitment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Vehicle Fitment</TabsTrigger>
            <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Specifications</TabsTrigger>
            <TabsTrigger value="warranty" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-bold text-base">Warranty</TabsTrigger>
          </TabsList>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              
              <TabsContent value="details" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-bold font-display mb-4">Description</h3>
                  <p className="text-slate-600 leading-relaxed">{product.description}</p>
                </div>
                
                {product.features && product.features.length > 0 && (
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
                  {vehicleFitment ? (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(vehicleFitment).map(([make, models]) => (
                        <AccordionItem key={make} value={make} className="border-b-0 px-4">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <span className="font-semibold">{make}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4 pl-4">
                              {(models as string[]).map((model, mIdx) => (
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
                      <p>Universal Fitment - Compatible with {product.make} {product.model} {product.year}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="specs" className="m-0 animate-in fade-in duration-300">
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y">
                      {specifications ? (
                        Object.entries(specifications).map(([key, value], idx) => (
                          <tr key={key} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                            <td className="px-6 py-4 font-medium text-slate-600 w-1/3">{key}</td>
                            <td className="px-6 py-4 text-slate-900">{value as string}</td>
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
                      <p className="text-primary font-medium">{warranty?.period || "Standard Manufacturer Warranty"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

            </div>

            <div className="lg:col-span-1 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold font-display text-sm uppercase tracking-wider">Similar Items</h3>
                  <Link href="/products" className="text-xs text-primary hover:underline">View All</Link>
                </div>
                <div className="space-y-4">
                  {similarProducts?.slice(0, 3).map((item) => (
                    <Link key={item.id} href={`/products/${item.id}`}>
                      <div className="group flex gap-3 cursor-pointer">
                        <div className="w-16 h-16 bg-white border rounded-md overflow-hidden flex-shrink-0">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</h4>
                          <div className="text-xs text-muted-foreground mt-1">{item.make}</div>
                          <div className="font-bold text-sm mt-1">AED {parseFloat(item.price).toLocaleString()}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold font-display text-sm uppercase tracking-wider">Recommended</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recommendedProducts?.slice(0, 4).map((item) => (
                    <Link key={item.id} href={`/products/${item.id}`}>
                      <div className="group cursor-pointer">
                        <div className="aspect-square bg-white border rounded-md overflow-hidden mb-2">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <h4 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</h4>
                      </div>
                    </Link>
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
