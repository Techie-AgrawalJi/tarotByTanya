import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function Pricing() {
  const [activeTab, setActiveTab] = useState("tarot");

  const tabs = ["Tarot", "Spell Casting & Healer", "Manifestation Rituals", "Face Reading & Name"];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handlePricingTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };

    window.addEventListener("pricing-tab-change", handlePricingTabChange as EventListener);

    return () => {
      window.removeEventListener("pricing-tab-change", handlePricingTabChange as EventListener);
    };
  }, []);

  const durationsByTab: Record<string, { time: string; price: string; included: string }[]> = {
    tarot: [
      { time: "Chat - 20 Minutes", price: "₹499", included: "Unlimited questions within a 20-minute chat session" },
      { time: "Chat - 30 Minutes", price: "₹699", included: "Unlimited questions with detailed reading and guidance" },
      { time: "Chat - 60 Minutes", price: "₹1,299", included: "Extended chat session with detailed reading and unlimited questions" },
      { time: "Video Call - 30 Minutes", price: "₹999", included: "Unlimited questions during a live video call" },
      { time: "Video Call - 1 Hour", price: "₹1,899", included: "Unlimited questions during an extended live video call" },
      { time: "Call - 15 Minutes", price: "₹399", included: "Unlimited questions during a 15-minute call" },
      { time: "Call - 20 Minutes", price: "₹549", included: "Unlimited questions during a 20-minute call" },
      { time: "Call - 30 Minutes", price: "₹799", included: "Unlimited questions during a 30-minute call" },
      { time: "Call - 45 Minutes", price: "₹1,199", included: "Unlimited questions during a 45-minute call" },
      { time: "Call - 1 Hour", price: "₹1,499", included: "Unlimited questions during a 1-hour call" },
    ],
    "spell casting & healer": [
      { time: "Healing - 1 Day", price: "₹1,300", included: "Energy healing and cleansing ritual" },
      { time: "Healing - 3 Days", price: "₹3,800", included: "3-day healing program with daily energy work" },
      { time: "Healing - 5 Days", price: "₹6,400", included: "Intensive 5-day healing transformation" },
      { time: "Spell - 3 Days", price: "₹3,600", included: "3-day spell casting for your intention" },
      { time: "Spell - 5 Days", price: "₹5,900", included: "5-day spell casting program" },
      { time: "Spell - 7 Days", price: "₹8,100", included: "Comprehensive 7-day spell casting ritual" },
    ],
    "manifestation rituals": [
      { time: "Single Ritual", price: "₹799", included: "One-time manifestation ritual" },
      { time: "30-Day Program", price: "₹2,499", included: "Daily guidance, weekly rituals" },
      { time: "Quarterly Plan", price: "₹5,999", included: "Monthly rituals, personalized practices" },
      { time: "Annual Alignment", price: "₹9,999", included: "Comprehensive yearly program with support" },
    ],
    "face reading & name": [
      { time: "Face Reading", price: "₹599", included: "20 Minutes Face Reading session telling about person's nature and more..." },
      { time: "Name Analysis & Correction", price: "₹799", included: "Name Correction report will be provided through whatsapp" },

    ],
  };

  const durations = durationsByTab[activeTab] ?? durationsByTab["tarot"];
  const isFaceReadingTab = activeTab === "face reading & name";

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
            <div className="h-px bg-linear-to-r from-transparent via-primary to-transparent"></div>
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

        {activeTab === "spell casting & healer" && (
          <div className="mb-6 w-full text-center">
            <p className="text-sm text-foreground/70 italic">Note: Charges for all spell types are the same.</p>
          </div>
        )}
        <div className={isFaceReadingTab ? "flex flex-wrap justify-center gap-6" : "grid md:grid-cols-2 lg:grid-cols-4 gap-6"}>
          {durations.map((pkg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={isFaceReadingTab ? "glass-card rounded-2xl p-6 relative flex flex-col items-center text-center border-white/10 glowing-border w-full max-w-sm" : "glass-card rounded-2xl p-6 relative flex flex-col border-white/10 glowing-border"}
            >
              <h4 className="text-xl font-serif font-bold text-white mb-2 mt-4">{pkg.time}</h4>
              <div className="text-3xl font-serif font-bold text-primary mb-4">{pkg.price}</div>
              
              <p className="text-foreground/80 font-light text-sm mb-8 grow">
                {pkg.included}
              </p>
              
              <button 
                onClick={() => scrollTo('booking')}
                className="w-full py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all duration-300 border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
