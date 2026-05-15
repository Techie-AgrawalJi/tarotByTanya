import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function Hero() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section 
      id="hero"
      data-testid="hero-section"
      className="min-h-screen flex flex-col justify-center items-center relative pt-16 sm:pt-20 px-4 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] opacity-20 pointer-events-none">
        <motion.img 
          src="https://images.unsplash.com/photo-1532517890697-3ad759b671de?auto=format&fit=crop&q=80&w=800"
          alt="Zodiac wheel"
          className="w-full h-full object-cover rounded-full mix-blend-screen filter brightness-200"
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a1a] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="z-10 text-center max-w-4xl mx-auto mt-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-semibold tracking-widest mb-8">
          <Sparkles className="w-4 h-4" />
          <span>Discover Your Cosmic Path</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight drop-shadow-lg">
          Unlock the Secrets the Universe Has Written for You
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
          Expert Astrology, Numerology & Tarot Readings — Personalized for Your Journey
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => scrollTo('booking')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-wider text-sm sm:text-base hover:bg-white hover:text-[#0a0a1a] transition-all duration-300 shadow-[0_0_20px_rgba(201,168,76,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
          >
            Book a Session
          </button>
          
          <button 
            onClick={() => scrollTo('services')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-white/20 text-white rounded-full font-bold uppercase tracking-wider text-sm sm:text-base hover:bg-white/10 transition-all duration-300"
          >
            Explore Services
          </button>
        </div>
      </motion.div>
    </section>
  );
}
