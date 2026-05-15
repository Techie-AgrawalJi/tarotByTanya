import { Moon } from "lucide-react";

export function Footer() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer data-testid="footer" className="bg-[#05050f] border-t border-white/5 py-12 px-4 relative z-10">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-serif font-bold text-2xl mb-2 cursor-pointer" onClick={() => scrollTo('hero')}>
            <Moon className="w-6 h-6" />
            Celestial Guidance
          </div>
          <div className="text-sm font-light text-foreground/60 uppercase tracking-widest">
            Where Stars Meet Souls
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm uppercase tracking-widest font-semibold text-foreground/60">
          <button onClick={() => scrollTo('about')} className="hover:text-primary transition-colors">About</button>
          <button onClick={() => scrollTo('services')} className="hover:text-primary transition-colors">Services</button>
          <button onClick={() => scrollTo('pricing')} className="hover:text-primary transition-colors">Pricing</button>
          <button onClick={() => scrollTo('booking')} className="hover:text-primary transition-colors">Book</button>
          <button onClick={() => scrollTo('contact')} className="hover:text-primary transition-colors">Contact</button>
        </div>
      </div>
      
      <div className="container mx-auto max-w-6xl mt-12 pt-8 border-t border-white/5 text-center text-sm font-light text-foreground/40">
        <p>© 2025 Celestial Guidance · All Rights Reserved · Crafted with ✨ & Stardust</p>
      </div>
    </footer>
  );
}
