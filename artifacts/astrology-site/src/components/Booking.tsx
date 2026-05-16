import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, CheckCircle2, X, Copy, CheckCheck } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email address"),
  service: z.string().min(1, "Please select a service"),
  duration: z.string().min(1, "Please select a duration"),
  date: z.string().min(1, "Please select a date"),
  timeslot: z.string().min(1, "Please select a time slot"),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const UPI_ID = "7877082223@upi";

function scrollToSection(id: string): void {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

export function Booking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [copied, setCopied] = useState(false);

  const styleTag = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
    .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
  `;

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("https://formspree.io/f/xpwrgekg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          ...data,
          _subject: `New Booking Request — ${data.service} ${data.duration} — ${data.name}`
        })
      });

      if (response.ok) {
        setSubmittedName(data.name);
        setShowSuccess(true);
        reset();
      } else {
        alert("There was a problem submitting your request. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("There was a problem submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="booking" data-testid="booking-section" className="py-12 md:py-24 px-4 relative z-10">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="mb-6 inline-block">
            <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Schedule Your Reading</h2>
            <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </div>
          <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white">Open the Portal</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-8 md:p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Full Name</label>
                <input 
                  {...register("name")}
                  data-testid="input-name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Jane Doe"
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Phone Number</label>
                <input 
                  {...register("phone")}
                  type="tel"
                  data-testid="input-phone"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Email Address</label>
                <input 
                  {...register("email")}
                  type="email"
                  data-testid="input-email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="jane@example.com"
                />
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Service Type</label>
                <select 
                  {...register("service")}
                  data-testid="select-service"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                >
                  <option value="">Select a service...</option>
                  <option value="Astrology">Astrology Reading</option>
                  <option value="Numerology">Numerology Reading</option>
                  <option value="Tarot">Tarot Reading</option>
                  <option value="Name Numerology Correction">Name Numerology Correction</option>
                </select>
                {errors.service && <p className="text-destructive text-sm mt-1">{errors.service.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Session Duration / Package</label>
                <select 
                  {...register("duration")}
                  data-testid="select-duration"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                >
                  <option value="">Select duration / package...</option>
                  <option value="10 Minutes">10 Minutes (₹499)</option>
                  <option value="15 Minutes">15 Minutes (₹799)</option>
                  <option value="30 Minutes">30 Minutes (₹1,499)</option>
                  <option value="1 Hour">1 Hour (₹2,499)</option>
                  <option value="Name Correction – Basic">Name Correction – Basic (₹699)</option>
                  <option value="Name Correction – Standard">Name Correction – Standard (₹1,199)</option>
                  <option value="Name Correction – Detailed Report">Name Correction – Detailed Report (₹1,999)</option>
                  <option value="Name Correction – Premium">Name Correction – Premium (₹2,999)</option>
                </select>
                {errors.duration && <p className="text-destructive text-sm mt-1">{errors.duration.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Preferred Date</label>
                <input 
                  {...register("date")}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-date"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Preferred Time Slot</label>
                <select 
                  {...register("timeslot")}
                  data-testid="select-timeslot"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                >
                  <option value="">Select time slot...</option>
                  <option value="Morning">Morning (9am - 12pm)</option>
                  <option value="Afternoon">Afternoon (1pm - 5pm)</option>
                  <option value="Evening">Evening (6pm - 9pm)</option>
                </select>
                {errors.timeslot && <p className="text-destructive text-sm mt-1">{errors.timeslot.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Message or Focus Area (Optional)</label>
                <textarea 
                  {...register("message")}
                  data-testid="input-message"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  placeholder="What brings you to seek guidance today?"
                ></textarea>
              </div>
            </div>

            {/* UPI Payment Section */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-4 text-center">Payment Method</p>
              <div className="bg-white/5 border border-primary/30 rounded-2xl p-5 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-lg">₹</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs text-foreground/60 font-bold uppercase tracking-wider mb-1">UPI Payment (GPay / PhonePe / Paytm)</p>
                      <p className="text-white font-bold text-base sm:text-lg tracking-wider break-all">{UPI_ID}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyUPI}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 text-primary text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex-shrink-0 w-full sm:w-auto justify-center"
                  >
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy UPI"}
                  </button>
                </div>
                <p className="text-foreground/50 text-xs mt-4 text-center italic">
                  * Booking confirm hone ke baad payment karein. Screenshot WhatsApp pe bhejein: +91 78770 82223
                </p>
              </div>
            </div>

            <div className="text-center">
              <button 
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit"
                className="w-full px-6 sm:px-12 py-4 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest text-sm sm:text-base hover:bg-white hover:text-[#0a0a1a] transition-all duration-300 shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Book My Session
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a1a]/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card rounded-3xl p-8 max-w-md w-full text-center relative border border-primary/30"
              data-testid="modal-success"
            >
              <button 
                onClick={() => setShowSuccess(false)}
                className="absolute top-4 right-4 text-foreground/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              
              <h3 className="text-3xl font-serif font-bold text-white mb-4">Journey Initiated</h3>
              <p className="text-foreground/90 font-light leading-relaxed mb-8">
                Thank you, <span className="text-primary font-bold">{submittedName}</span>! Your booking request has been received. A payment link and confirmation will be sent to your email shortly.
              </p>
              
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold uppercase tracking-widest transition-all duration-300"
              >
                Return to the stars
              </button>

              <button
                onClick={() => {
                  setShowSuccess(false);
                  scrollToSection("reviews");
                }}
                className="mt-3 w-full py-3 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full font-bold uppercase tracking-widest transition-all duration-300"
              >
                Leave a Review
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
