
import { Product } from "@/lib/mockApi";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Lock } from "lucide-react";
import { Link } from "wouter";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden group hover:border-primary/50 transition-colors duration-300 h-full flex flex-col">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-secondary relative cursor-pointer">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {product.stock < 10 && product.stock > 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm">
              Low Stock: {product.stock}
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="secondary" className="absolute top-2 right-2 shadow-sm bg-slate-800 text-white">
              Out of Stock
            </Badge>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 shadow-sm backdrop-blur-md bg-background/80">
            {product.condition.toUpperCase()}
          </Badge>
        </div>
      </Link>
      
      <CardContent className="p-4 flex-1">
        <div className="text-xs text-muted-foreground mb-1">{product.vendor}</div>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span className="bg-secondary px-2 py-0.5 rounded text-xs">{product.make} {product.model}</span>
          <span>{product.year}</span>
        </div>
        <div className="font-mono text-xs text-muted-foreground">SKU: {product.sku}</div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
        {product.price !== null ? (
          <div className="font-bold text-xl text-primary">
            ${product.price.toFixed(2)}
          </div>
        ) : (
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> Login to view price
          </div>
        )}
        
        {product.price !== null ? (
          <Button size="sm" variant="outline" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        ) : (
          <Link href="/auth/login">
            <Button size="sm" variant="secondary" className="gap-2">
              Login
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
