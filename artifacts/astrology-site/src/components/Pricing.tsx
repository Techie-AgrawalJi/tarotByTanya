import { motion } from "framer-motion";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function Pricing() {
  const [activeTab, setActiveTab] = useState("astrology");

  const tabs = ["Astrology", "Numerology", "Tarot", "Name Correction"];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const durationsByTab: Record<string, { time: string; price: string; included: string; popular?: boolean }[]> = {
    astrology: [
      { time: "10 Minutes", price: "₹499", included: "Quick guidance, 1 focused question" },
      { time: "15 Minutes", price: "₹799", included: "Targeted reading, brief chart overview" },
      { time: "30 Minutes", price: "₹1,499", included: "In-depth reading, Q&A included", popular: true },
      { time: "1 Hour", price: "₹2,499", included: "Full session, detailed report, follow-up" },
    ],
    numerology: [
      { time: "10 Minutes", price: "₹499", included: "Quick guidance, 1 focused question" },
      { time: "15 Minutes", price: "₹799", included: "Life path overview, key numbers" },
      { time: "30 Minutes", price: "₹1,499", included: "In-depth reading, Q&A included", popular: true },
      { time: "1 Hour", price: "₹2,499", included: "Full session, detailed report, follow-up" },
    ],
    tarot: [
      { time: "10 Minutes", price: "₹499", included: "Quick guidance, 1 focused question" },
      { time: "15 Minutes", price: "₹799", included: "3-card spread, brief insight" },
      { time: "30 Minutes", price: "₹1,499", included: "Full spread, Q&A included", popular: true },
      { time: "1 Hour", price: "₹2,499", included: "Full session, detailed report, follow-up" },
    ],
    "name correction": [
      { time: "Basic Analysis", price: "₹699", included: "Name vibration check, brief report" },
      { time: "Standard", price: "₹1,199", included: "Name analysis + correction suggestions" },
      { time: "Detailed Report", price: "₹1,999", included: "Full numerology correction + written report", popular: true },
      { time: "Premium", price: "₹2,999", included: "Complete report, lucky names list, follow-up session" },
    ],
  };

  const durations = durationsByTab[activeTab] ?? durationsByTab["astrology"];

  return (
    <section id="pricing" data-testid="pricing-section" className="py-24 px-4 relative z-10 bg-[#0a0a1a]/50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
        .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
      `}</style>
      <div className="container mx-auto max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="mb-6 inline-block w-full">
            <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Choose Your Session</h2>
            <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </div>
          <h3 className="heading-luxury text-5xl md:text-6xl text-white">Investment in Clarity</h3>
        </motion.div>

        <div className="flex justify-center gap-4 mb-12">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-6 py-2 rounded-full font-bold tracking-wider uppercase text-sm transition-all duration-300 ${
                activeTab === tab.toLowerCase() 
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(201,168,76,0.4)]" 
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {durations.map((pkg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 relative flex flex-col ${pkg.popular ? 'border-primary shadow-[0_0_20px_rgba(201,168,76,0.15)] transform md:-translate-y-4' : 'border-white/10 glowing-border'}`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(201,168,76,0.5)] whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}
              
              <h4 className="text-xl font-serif font-bold text-white mb-2 mt-4">{pkg.time}</h4>
              <div className="text-3xl font-serif font-bold text-primary mb-4">{pkg.price}</div>
              
              <p className="text-foreground/80 font-light text-sm mb-8 flex-grow">
                {pkg.included}
              </p>
              
              <button 
                onClick={() => scrollTo('booking')}
                className={`w-full py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all duration-300 ${
                  pkg.popular 
                    ? "bg-primary text-primary-foreground hover:bg-white hover:text-[#0a0a1a]" 
                    : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                Book Now
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
