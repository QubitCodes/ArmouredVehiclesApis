import { Link } from "wouter";
import { Product } from "@/lib/mockApi";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden group hover:border-primary/50 transition-colors duration-300">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-secondary relative cursor-pointer">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {product.stock < 10 && (
            <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm">
              Low Stock: {product.stock}
            </Badge>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 shadow-sm backdrop-blur-md bg-background/80">
            {product.condition.toUpperCase()}
          </Badge>
        </div>
      </Link>
      
      <CardContent className="p-4">
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
        <div className="font-bold text-xl text-primary">
          ${product.price.toFixed(2)}
        </div>
        <Button size="sm" variant="outline" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
          <ShoppingCart className="h-4 w-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
