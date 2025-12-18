import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mockApi";
import { useRoute } from "wouter";
import { ShoppingCart, Heart, Truck, Shield, RotateCcw } from "lucide-react";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const id = params ? parseInt(params.id) : 0;

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id)
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden border">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-secondary rounded cursor-pointer border hover:border-primary transition-colors">
                  {/* Thumbnails would go here */}
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-2">
              <Badge variant="outline" className="mr-2">{product.category}</Badge>
              <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </Badge>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-display font-bold mb-2">{product.name}</h1>
            <div className="text-lg text-muted-foreground mb-6">
              SKU: <span className="font-mono text-foreground">{product.sku}</span>
            </div>

            <div className="flex items-end gap-4 mb-8">
              <span className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</span>
              {/* <span className="text-xl text-muted-foreground line-through mb-1">$599.00</span> */}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="flex-1 gap-2 h-12 text-lg">
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </Button>
              <Button size="lg" variant="outline" className="h-12 w-12 px-0">
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-sm">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">Fast Shipping</div>
                  <div className="text-muted-foreground">Global delivery available via DHL/FedEx</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">Quality Guarantee</div>
                  <div className="text-muted-foreground">Verified vendor with 4.8/5 rating</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">30-Day Returns</div>
                  <div className="text-muted-foreground">Hassle-free return policy</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-display font-bold text-lg mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                  <br /><br />
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg mb-2">Specifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-secondary/50 rounded flex justify-between">
                    <span className="text-muted-foreground">Make</span>
                    <span className="font-medium">{product.make}</span>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{product.model}</span>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded flex justify-between">
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-medium">{product.year}</span>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded flex justify-between">
                    <span className="text-muted-foreground">Condition</span>
                    <span className="font-medium capitalize">{product.condition}</span>
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
