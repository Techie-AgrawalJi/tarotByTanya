import { motion } from "framer-motion";
import { Wand2, Lightbulb, Eye, Sparkles } from "lucide-react";

export function Services() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const openPricingTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent("pricing-tab-change", { detail: { tab } }));
    scrollTo("pricing");
  };

  const services = [
    {
      title: "Tarot Reading",
      icon: Sparkles,
      pricingTab: "tarot",
      desc: "Past, present, and future spreads offering spiritual insight, clarity on love and career, and actionable guidance for your journey.",
    },
    {
      title: "Spell Casting & Healer",
      icon: Wand2,
      pricingTab: "spell casting & healer",
      desc: "Harness the power of intention and energy. Custom spells for protection, abundance, love, and healing tailored to your specific needs.",
    },
    {
      title: "Manifestation Rituals",
      icon: Lightbulb,
      pricingTab: "manifestation rituals",
      desc: "Align with universal abundance through guided rituals and practices designed to amplify your intentions and attract positive energy into your life.",
    },
    {
      title: "Face Reading & Name Correction",
      icon: Eye,
      pricingTab: "face reading & name",
      desc: "Discover what your features reveal about your personality and destiny. Includes name vibration analysis and correction suggestions for alignment.",
    },
  ];

  return (
    <section 
      id="services" 
      data-testid="services-section"
      className="py-12 md:py-24 px-4 relative z-10"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
        .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
      `}</style>
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="mb-6 inline-block">
            <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Our Sacred Readings</h2>
            <div className="h-px bg-linear-to-r from-transparent via-primary to-transparent"></div>
          </div>
          <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white">Illuminate Your Path</h3>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((svc, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="glass-card rounded-2xl p-8 glowing-border flex flex-col items-start group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svc.icon className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <h4 className="text-2xl font-serif font-bold text-white mb-4">{svc.title}</h4>
              <p className="text-foreground/80 font-light leading-relaxed mb-8 grow">
                {svc.desc}
              </p>
              <button 
                onClick={() => openPricingTab(svc.pricingTab)}
                className="text-sm font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2"
              >
                View Pricing →
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
