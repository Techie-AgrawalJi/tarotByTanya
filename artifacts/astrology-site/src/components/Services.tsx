import { motion } from "framer-motion";
import { Wand2, Lightbulb, Eye, Sparkles, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Services() {
  const [spellModalOpen, setSpellModalOpen] = useState(false);
  const [manifestationModalOpen, setManifestationModalOpen] = useState(false);

  const spellTypes = [
    "Reuniting Hearts",
    "Casting Off Negativity",
    "The Job Undoing",
    "Harmonious Marriage Rites",
    "Deep Relationship Bonds",
    "The Path of Happiness",
    "Soul & Body Healing",
    "Holistic Health Callings",
    "Wealth Manifestation",
    "Career Advancement Tides",
    "Flourishing Business Rites",
    "Attracting the Crush",
    "True Devotion (Obsession) Callings",
    "Opening Clear Communication",
    "Granting Any Deep Wish",
    "The Job (Secure) Spell",
    "Passing the Exam Rite",
    "Card Clarity & Liberation",
    "Nurturing Self-Love",
    "Journey & Visa Rite",
    "Freedom from Addiction",
    "Securing Commitment",
    "Chakra Awakening (7/10)",
  ];

  const manifestationRituals = [
    "Candle Spells",
    "Healings",
    "St. Expedite Ritual for Wish Fulfillment",
    "Goddess Aphrodite Ritual (for Beauty)",
    "Nitika Ritual for Wealth",
    "King Clauneck Ritual",
    "Bay Leaf Manifestation Ritual",
  ];
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
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => openPricingTab(svc.pricingTab)}
                  className="text-sm font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2"
                >
                  View Pricing →
                </button>
                {svc.title === "Spell Casting & Healer" && (
                  <Dialog open={spellModalOpen} onOpenChange={setSpellModalOpen}>
                    <DialogTrigger asChild>
                      <button className="text-sm font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2">
                        Know More ✨
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-linear-to-br from-[#0b0b18] via-[#1a1a2e] to-[#0b0b18] border border-primary/30 text-left shadow-2xl">
                      <style>{`
                        .spell-grid-item {
                          background: linear-gradient(135deg, rgba(201, 156, 46, 0.05) 0%, rgba(201, 156, 46, 0.02) 100%);
                          border: 1px solid rgba(201, 156, 46, 0.2);
                          transition: all 0.3s ease;
                          position: relative;
                          overflow: hidden;
                        }
                        .spell-grid-item::before {
                          content: '';
                          position: absolute;
                          top: 0;
                          left: -100%;
                          width: 100%;
                          height: 100%;
                          background: linear-gradient(90deg, transparent, rgba(201, 156, 46, 0.1), transparent);
                          transition: left 0.5s;
                        }
                        .spell-grid-item:hover::before {
                          left: 100%;
                        }
                        .spell-grid-item:hover {
                          background: linear-gradient(135deg, rgba(201, 156, 46, 0.15) 0%, rgba(201, 156, 46, 0.08) 100%);
                          border-color: rgba(201, 156, 46, 0.4);
                          transform: translateY(-2px);
                          box-shadow: 0 8px 24px rgba(201, 156, 46, 0.15);
                        }
                      `}</style>
                      <DialogHeader>
                        <DialogTitle className="text-3xl font-serif text-white flex items-center gap-3">
                          <span className="text-primary text-4xl">✨</span>
                          Sacred Spell Types
                        </DialogTitle>
                        <p className="text-foreground/60 text-sm mt-2">Explore the mystical power of white magic pathways</p>
                      </DialogHeader>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        {spellTypes.map((spell, idx) => (
                          <div
                            key={idx}
                            className="spell-grid-item rounded-xl p-4 group cursor-default"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-primary text-lg font-bold shrink-0 mt-0.5">◆</span>
                              <p className="text-white font-medium text-base leading-relaxed drop-shadow-sm group-hover:text-primary transition-colors">
                                {spell}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-foreground/70 text-sm leading-relaxed">
                          Each spell is crafted with pure intention and aligned with cosmic energies. Our practitioners work with white magic principles to bring healing and positive transformation into your life.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {svc.title === "Manifestation Rituals" && (
                  <Dialog open={manifestationModalOpen} onOpenChange={setManifestationModalOpen}>
                    <DialogTrigger asChild>
                      <button className="text-sm font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2">
                        Know More ✨
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-linear-to-br from-[#0b0b18] via-[#1a1a2e] to-[#0b0b18] border border-primary/30 text-left shadow-2xl">
                      <style>{`
                        .ritual-grid-item {
                          background: linear-gradient(135deg, rgba(201, 156, 46, 0.05) 0%, rgba(201, 156, 46, 0.02) 100%);
                          border: 1px solid rgba(201, 156, 46, 0.2);
                          transition: all 0.3s ease;
                          position: relative;
                          overflow: hidden;
                        }
                        .ritual-grid-item::before {
                          content: '';
                          position: absolute;
                          top: 0;
                          left: -100%;
                          width: 100%;
                          height: 100%;
                          background: linear-gradient(90deg, transparent, rgba(201, 156, 46, 0.1), transparent);
                          transition: left 0.5s;
                        }
                        .ritual-grid-item:hover::before {
                          left: 100%;
                        }
                        .ritual-grid-item:hover {
                          background: linear-gradient(135deg, rgba(201, 156, 46, 0.15) 0%, rgba(201, 156, 46, 0.08) 100%);
                          border-color: rgba(201, 156, 46, 0.4);
                          transform: translateY(-2px);
                          box-shadow: 0 8px 24px rgba(201, 156, 46, 0.15);
                        }
                      `}</style>
                      <DialogHeader>
                        <DialogTitle className="text-3xl font-serif text-white flex items-center gap-3">
                          <span className="text-primary text-4xl">🌙</span>
                          Sacred Manifestation Rituals
                        </DialogTitle>
                        <p className="text-foreground/60 text-sm mt-2">Harness the power of cosmic energy to manifest your deepest desires</p>
                      </DialogHeader>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        {manifestationRituals.map((ritual, idx) => (
                          <div
                            key={idx}
                            className="ritual-grid-item rounded-xl p-4 group cursor-default"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-primary text-lg font-bold shrink-0 mt-0.5">★</span>
                              <p className="text-white font-medium text-base leading-relaxed drop-shadow-sm group-hover:text-primary transition-colors">
                                {ritual}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-foreground/70 text-sm leading-relaxed">
                          Each ritual is designed to align your energy with the universe and amplify your intentions. Through sacred practices, we help you attract abundance, healing, and positive transformation into every area of your life.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


