import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type ApiReview = { name: string; reviewText: string | null; rating: number; createdAt: string };

export function Testimonials() {
  const [reviews, setReviews] = useState<ApiReview[]>([]);

  const styleTag = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
    .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
  `;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch((import.meta.env.VITE_API_BASE_URL ?? "") + "/api/reviews", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setReviews(data.reviews?.map((r: any) => ({ name: r.name, reviewText: r.reviewText, rating: r.rating, createdAt: r.createdAt })) ?? []);
      } catch {
        // ignore
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = reviews.length > 0 ? reviews : [
    { name: "Sarah M.", reviewText: "My birth chart reading revealed patterns I never understood before.", rating: 5, createdAt: new Date().toISOString() },
    { name: "James L.", reviewText: "The past/present/future spread was uncannily accurate.", rating: 5, createdAt: new Date().toISOString() },
    { name: "Luna K.", reviewText: "Understanding my life path number unlocked something deep within me.", rating: 5, createdAt: new Date().toISOString() },
  ];

  return (
    <section id="testimonials" data-testid="testimonials-section" className="py-24 overflow-hidden relative z-10">
      <style>{styleTag}</style>
      <div className="container mx-auto px-4 mb-16 text-center">
        <div className="mb-6 inline-block">
          <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Whispers of the Stars</h2>
          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
        </div>
        <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white">Guided Souls</h3>
      </div>

      <div className="relative flex w-full">
        <motion.div
          className="flex gap-6 px-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 25, repeat: Infinity }}
          style={{ width: "fit-content" }}
        >
          {[...items, ...items, ...items].map((t, i) => (
            <div key={i} className="glass-card rounded-2xl p-8 w-[280px] sm:w-[350px] flex-shrink-0 border border-white/5 glowing-border">
              <div className="flex gap-1 mb-6">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} className={`w-5 h-5 ${star <= t.rating ? "fill-primary text-primary" : "text-white/20"}`} />
                ))}
              </div>
              <p className="text-foreground/90 font-light leading-relaxed italic mb-8 min-h-[120px]">"{t.reviewText}"</p>
              <div className="mt-auto border-t border-white/10 pt-4">
                <div className="font-serif font-bold text-white text-lg">{t.name}</div>
                <div className="text-sm text-primary uppercase tracking-widest mt-1">Client</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;
