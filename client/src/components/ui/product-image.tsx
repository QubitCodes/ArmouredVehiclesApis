import { useState } from "react";
import { Package } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23e2e8f0' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ProductImage({ src, alt, className = "", placeholderClassName = "" }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const showPlaceholder = !src || hasError;

  if (showPlaceholder) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${placeholderClassName || className}`}>
        <div className="text-center text-slate-400">
          <Package className="h-12 w-12 mx-auto mb-2" />
          <span className="text-xs">No Image</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`flex items-center justify-center bg-slate-100 animate-pulse ${placeholderClassName || className}`}>
          <Package className="h-8 w-8 text-slate-300" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
      />
    </>
  );
}
