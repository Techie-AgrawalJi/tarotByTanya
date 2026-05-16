import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { SiInstagram, SiFacebook, SiWhatsapp } from "react-icons/si";

export function Contact() {
  const styleTag = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
    .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
  `;
  return (
    <section id="contact" data-testid="contact-section" className="py-12 md:py-24 relative z-10 px-3 sm:px-4">
      <style>{styleTag}</style>
      {/* Moon phase divider */}
      <div className="container mx-auto px-0 sm:px-4 flex justify-center items-center gap-4 mb-20 opacity-50">
        <div className="w-8 h-8 rounded-full border border-primary shrink-0" />
        <div className="w-8 h-8 rounded-full border border-primary shrink-0 bg-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary translate-x-1/2" />
        </div>
        <div className="w-10 h-10 rounded-full bg-primary shrink-0 shadow-[0_0_20px_rgba(201,168,76,0.6)]" />
        <div className="w-8 h-8 rounded-full border border-primary shrink-0 bg-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary -translate-x-1/2" />
        </div>
        <div className="w-8 h-8 rounded-full border border-primary shrink-0" />
      </div>

      <div className="container mx-auto max-w-4xl px-0 sm:px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl px-3 py-6 sm:px-6 sm:py-8 md:p-16 text-center relative overflow-hidden border border-white/10"
        >
          <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <div className="mb-6">
            <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Get in Touch</h2>
            <div className="h-px w-16 mx-auto bg-linear-to-r from-primary via-primary to-transparent"></div>
          </div>
          <h2 className="heading-luxury text-2xl sm:text-3xl md:text-5xl text-white mb-8">Reach Across the Void</h2>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-12 text-left mb-12">
            <div className="space-y-8">
              <a href="mailto:readings@celestialguidance.com" className="flex items-center gap-6 group">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-1">Email Us</div>
                  <div className="text-sm sm:text-base md:text-lg text-white break-all group-hover:text-primary transition-colors">readings@celestialguidance.com</div>
                </div>
              </a>
              
              <a href="tel:+917877082223" className="flex items-center gap-6 group">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-1">Call / WhatsApp</div>
                  <div className="text-sm sm:text-base md:text-lg text-white break-all group-hover:text-primary transition-colors">+91 78770 82223</div>
                </div>
              </a>

              <a
                href="https://wa.me/917877082223?text=Namaste!%20Mujhe%20ek%20reading%20book%20karni%20hai."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center group-hover:bg-[#25D366] group-hover:border-[#25D366] transition-all duration-300">
                  <SiWhatsapp className="w-6 h-6 text-[#25D366] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-1">WhatsApp</div>
                  <div className="text-sm sm:text-base md:text-lg text-white break-all group-hover:text-[#25D366] transition-colors">Chat with us on WhatsApp</div>
                </div>
              </a>
            </div>
            
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-6">Connect & Follow</div>
              <div className="flex gap-4">
                <a href="#" className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E1306C] hover:border-[#E1306C] transition-all duration-300 text-foreground hover:text-white group">
                  <SiInstagram className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877F2] hover:border-[#1877F2] transition-all duration-300 text-foreground hover:text-white group">
                  <SiFacebook className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10">
            <p className="text-foreground/70 font-light italic">
              "For urgent inquiries, reach out directly — responses within 24 hours"
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
