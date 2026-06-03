import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Moon, Lock } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const isBrowser = typeof window !== "undefined";
  const showAdminLink =
    (import.meta as any).env.DEV === true ||
    (import.meta as any).env.VITE_SHOW_ADMIN_LINK === "true" ||
    ((typeof window !== "undefined" && (window as any).__SHOW_ADMIN_LINK === true) ?? false) ||
    (isBrowser && window.location.hostname.includes("localhost"));

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

  // Defensive: ensure brand stays exactly as authored even if other scripts mutate it.
  useEffect(() => {
    const id = "brand-static";
    const desired = "DivineTanyaa";
    const el = () => document.getElementById(id) as HTMLElement | null;
    const apply = (target: HTMLElement | null) => {
      if (!target) return;
      try {
        if (target.innerText !== desired) target.innerText = desired;
        target.style.textTransform = "none";
        target.style.setProperty("font-variant-caps", "normal", "important");
        target.style.setProperty("font-feature-settings", "normal", "important");
      } catch (e) {
        /* ignore */
      }
    };
    apply(el());
    const mo = new MutationObserver(() => apply(el()));
    mo.observe(document.documentElement || document.body, { attributes: true, childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, []);

  return (
    <nav
      className={
        "fixed top-0 w-full z-50 transition-all duration-300 " +
        (scrolled ? "bg-[#0a0a1a]/80 backdrop-blur-md py-3 shadow-lg" : "bg-transparent py-5")
      }
    >
      <style>{`#brand-static{text-transform: none !important; -webkit-text-transform: none !important; font-variant-caps: normal !important; font-variant: normal !important; font-feature-settings: normal !important; -webkit-font-variant: normal !important; font-family: Georgia, 'Times New Roman', serif !important;}`}</style>
      <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl md:text-2xl">
          <Dialog>
            <DialogTrigger asChild>
              <button aria-label="View logo" className="inline-flex p-0">
                <img src="logo.png" alt="logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-4">
              <div className="flex items-center justify-center">
                <img src="logo.png" alt="logo large" className="max-h-[60vh] max-w-full object-contain" />
              </div>
            </DialogContent>
          </Dialog>

          <button
            id="brand-static"
            onClick={() => scrollTo('hero')}
            className="ml-2 cursor-pointer text-left normal-case brand-normal font-sans font-normal text-2xl md:text-3xl lg:text-4xl"
            style={{ textTransform: "none", fontVariantCaps: "normal", fontVariant: "normal", fontFeatureSettings: "normal", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            DivineTanyaa
          </button>
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
          {showAdminLink ? (
            <Link href="/admin">
              <button className="px-4 py-2 flex items-center gap-2 border border-white/10 rounded text-white/80 hover:bg-white/5">
                <Lock className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </Link>
          ) : null}
        </div>
        {/* Mobile admin button: visible on small screens */}
        {showAdminLink ? (
          <div className="md:hidden flex items-center">
            <Link href="/admin">
              <button className="ml-2 px-3 py-2 flex items-center gap-2 border border-white/10 rounded text-white/80 hover:bg-white/5">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Admin</span>
              </button>
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
