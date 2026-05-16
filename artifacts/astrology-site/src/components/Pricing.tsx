import { motion } from "framer-motion";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function Pricing() {
  const [activeTab, setActiveTab] = useState("tarot");

  const tabs = ["Tarot", "Spell Casting & Healer", "Manifestation Rituals", "Face Reading & Name"];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const durationsByTab: Record<string, { time: string; price: string; included: string; popular?: boolean }[]> = {
    tarot: [
      { time: "10 Minutes", price: "₹199", included: "Quick guidance, 1 focused question" },
      { time: "15 Minutes", price: "₹249", included: "3-card spread, brief insight" },
      { time: "30 Minutes", price: "₹499", included: "Full spread, Q&A included", popular: true },
      { time: "1 Hour", price: "₹899", included: "Full session, detailed report, follow-up" },
    ],
    "spell casting & healer": [
      { time: "Consultation", price: "₹699", included: "Initial assessment, spell needs discussion" },
      { time: "Basic Spell", price: "₹1,499", included: "Single intention spell casting" },
      { time: "Healing Session", price: "₹1,999", included: "Energy healing + cleansing ritual", popular: true },
      { time: "Premium Package", price: "₹3,499", included: "Custom spell + healing + follow-up" },
    ],
    "manifestation rituals": [
      { time: "Single Ritual", price: "₹799", included: "One-time manifestation ritual" },
      { time: "30-Day Program", price: "₹2,499", included: "Daily guidance, weekly rituals", popular: true },
      { time: "Quarterly Plan", price: "₹5,999", included: "Monthly rituals, personalized practices" },
      { time: "Annual Alignment", price: "₹9,999", included: "Comprehensive yearly program with support" },
    ],
    "face reading & name": [
      { time: "Face Reading", price: "₹699", included: "Basic face reading analysis" },
      { time: "Name Analysis", price: "₹999", included: "Name vibration check, suggestions" },
      { time: "Combined Reading", price: "₹1,799", included: "Face reading + name correction", popular: true },
      { time: "Premium Report", price: "₹2,999", included: "Complete analysis + written report + follow-up" },
    ],
  };

  const durations = durationsByTab[activeTab] ?? durationsByTab["tarot"];

  return (
    <section id="pricing" data-testid="pricing-section" className="py-12 md:py-24 px-4 relative z-10 bg-[#0a0a1a]/50">
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
          <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white">Investment in Clarity</h3>
        </motion.div>

        <div className="flex justify-center gap-2 md:gap-4 mb-12 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-3 md:px-6 py-2 rounded-full font-bold tracking-wider uppercase text-xs md:text-sm transition-all duration-300 ${
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
