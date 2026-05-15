import { motion } from "framer-motion";
import { Star } from "lucide-react";

const CLIENT_PHOTO_URL =
  "https://res.cloudinary.com/dpeycvvoy/image/upload/f_auto/q_auto/tanu_yvbeuo.jpg";

export function About() {
  return (
    <section
      id="about"
      data-testid="about-section"
      className="py-24 px-4 relative"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
        .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
      `}</style>
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            {CLIENT_PHOTO_URL ==
            "https://res.cloudinary.com/dpeycvvoy/image/upload/f_auto/q_auto/tanu_yvbeuo.jpg" ? (
              <img
                src={CLIENT_PHOTO_URL}
                alt="Client spiritual guide"
                className="relative z-10 rounded-2xl shadow-[0_0_40px_rgba(45,27,105,0.4)] border border-white/10 object-cover aspect-[4/5] w-full"
              />
            ) : (
              <div className="relative z-10 rounded-2xl shadow-[0_0_40px_rgba(45,27,105,0.4)] border border-white/10 aspect-[4/5] w-full bg-white/5 flex items-center justify-center px-6 text-center">
                <p className="text-foreground/70 text-sm uppercase tracking-[0.2em]">
                  Upload a client photo to Cloudinary
                </p>
              </div>
            )}
            <div className="absolute -bottom-6 -right-6 glass-card p-6 rounded-xl z-20 animate-pulse-slow">
              <Star className="w-8 h-8 text-primary mb-2" />
              <div className="font-serif font-bold text-2xl text-white">
                5+
              </div>
              <div className="text-sm text-foreground/80 uppercase tracking-widest">
                Years Guiding
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-8">
              <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Meet Your Guide</h2>
              <div className="h-px w-16 bg-gradient-to-r from-primary via-primary to-transparent"></div>
            </div>
            <h3 className="heading-luxury text-5xl md:text-6xl text-white mb-6">A Beacon in the Cosmic Dark</h3>

            <div className="space-y-6 text-lg text-foreground/80 font-light leading-relaxed">
              <p>
                As an experienced spiritual guide with over 15 years of
                practice, I've dedicated my life to interpreting the intricate
                language of the stars, numbers, and cards.
              </p>
              <p>
                My mission is to help souls navigate their earthly journey by
                unlocking the cosmic wisdom written in their very being. Whether
                you're seeking clarity in your career, navigating complex
                relationships, or searching for your true life purpose, the
                universe always has an answer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-12 pt-10 border-t border-white/10">
              <div>
                <div className="text-3xl font-serif font-bold text-white mb-2">
                  3,000+
                </div>
                <div className="text-sm uppercase tracking-wider text-primary">
                  Clients Guided
                </div>
              </div>
              <div>
                <div className="text-3xl font-serif font-bold text-white mb-2">
                  500+
                </div>
                <div className="text-sm uppercase tracking-wider text-primary">
                  Five-Star Reviews
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
