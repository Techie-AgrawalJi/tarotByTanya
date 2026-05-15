import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Moon } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a1a]/80 backdrop-blur-md py-3 shadow-lg" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl md:text-2xl cursor-pointer" onClick={() => scrollTo('hero')}>
          <Moon className="w-6 h-6" />
         TarotByTanya
        </div>
        
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm uppercase tracking-widest font-semibold text-foreground/80">
          <button onClick={() => scrollTo('about')} className="hover:text-primary transition-colors">About</button>
          <button onClick={() => scrollTo('services')} className="hover:text-primary transition-colors">Services</button>
          <button onClick={() => scrollTo('pricing')} className="hover:text-primary transition-colors">Pricing</button>
          <button onClick={() => scrollTo('reviews')} className="hover:text-primary transition-colors">Reviews</button>
          <button onClick={() => scrollTo('contact')} className="hover:text-primary transition-colors">Contact</button>
          
          <button 
            onClick={() => scrollTo('booking')}
            className="px-5 py-2 border border-primary text-primary rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-[0_0_10px_rgba(201,168,76,0.2)] hover:shadow-[0_0_20px_rgba(201,168,76,0.6)]"
          >
            Book Now
          </button>
        </div>
      </div>
    </nav>
  );
}
