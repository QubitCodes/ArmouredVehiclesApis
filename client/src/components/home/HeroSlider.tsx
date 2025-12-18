import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { Slide } from "@/lib/mockApi";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface HeroSliderProps {
  slides: Slide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  return (
    <div className="relative overflow-hidden bg-slate-900" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {slides.map((slide) => (
          <div key={slide.id} className="relative flex-[0_0_100%] min-w-0">
            <div className="relative h-[500px] w-full">
              {/* Background Image */}
              <img
                src={slide.image}
                alt={slide.title || "Hero Image"}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-center">
                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {slide.title && (
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 leading-tight">
                      {slide.title}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-xl leading-relaxed">
                      {slide.subtitle}
                    </p>
                  )}
                  <Link href={slide.link}>
                    <Button size="lg" className="text-base font-bold px-8 h-12 gap-2">
                      {slide.buttonText} <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
