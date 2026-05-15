import { motion } from "framer-motion";
import { Star, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";

type ReviewImage = {
  id: string;
  filename: string;
  mimeType: string;
  src: string;
};

type ReviewRecord = {
  id: string;
  name: string;
  rating: number;
  reviewText: string | null;
  images: ReviewImage[];
  createdAt: string;
};

type ReviewsResponse = {
  reviews: ReviewRecord[];
  summary: {
    totalReviews: number;
    averageRating: number;
  };
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= rating ? "fill-primary text-primary" : "text-white/20"}`}
        />
      ))}
    </div>
  );
}

export function Reviews() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [summary, setSummary] = useState({ totalReviews: 0, averageRating: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews: string[] = [];
    
    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === newFiles.length) {
              setSelectedPreviews(prev => [...prev, ...newPreviews]);
              setSelectedFiles(prev => [...prev, ...newFiles]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setSelectedFiles([]);
    setSelectedPreviews([]);
  };

  const starDistribution = useMemo(() => {
    if (reviews.length === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { dist[r.rating as 1|2|3|4|5]++; });
    return dist;
  }, [reviews]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl("/api/reviews"), { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load reviews.");
        }

        const data = (await response.json()) as ReviewsResponse;

        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setSummary(data.summary ?? { totalReviews: 0, averageRating: 0 });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reviews.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  const repeatedReviews = useMemo(() => reviews.slice(0, 8), [reviews]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    const formEl = event.currentTarget as HTMLFormElement; // capture DOM element to avoid synthetic event pooling

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    formData.set("rating", String(selectedRating));
    
    // Remove the default photos field and add selected files
    formData.delete("photos");
    selectedFiles.forEach((file) => {
      formData.append("photos", file);
    });

    console.log("Submitting review to:", apiUrl("/api/reviews"));
    console.log("Selected files:", selectedFiles);
    console.log("FormData entries:", Array.from(formData.entries()));

    try {
      const response = await fetch(apiUrl("/api/reviews"), {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);

      let payload: { message?: string; review?: ReviewRecord } | null = null;
      let errorMessage = "";

      try {
        const text = await response.text();
        console.log("Response text:", text);
        payload = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", parseErr);
        // Provide user-friendly error messages based on response status
        if (response.status === 404) {
          errorMessage = "Cannot connect to server. Please check that the API server is running and try again.";
        } else if (response.status >= 500) {
          errorMessage = "Server is temporarily unavailable. Please try again later.";
        } else if (response.status === 413) {
          errorMessage = "One or more images are too large. Maximum 5MB per image.";
        } else if (response.status === 400) {
          errorMessage = "Invalid submission. Please check your form and try again.";
        } else {
          errorMessage = "Unable to submit review. Please try again.";
        }
      }

      console.log("Response payload:", payload);

      if (!response.ok) {
        // Use the message from payload if available, otherwise use our constructed error
        const finalErrorMessage = payload?.message || errorMessage || "Unable to submit review. Please try again.";
        throw new Error(finalErrorMessage);
      }

      const createdReview = payload?.review;

      if (createdReview) {
        setReviews((current) => [createdReview, ...current]);
        setSummary((current) => {
          const prev = current ?? { totalReviews: 0, averageRating: 0 };
          const total = (prev.totalReviews ?? 0) + 1;
          const avg = Number(
            ((((prev.averageRating ?? 0) * (prev.totalReviews ?? 0)) + (createdReview.rating ?? 0)) /
              total).toFixed(1),
          );

          return { totalReviews: total, averageRating: avg };
        });
      } else {
        throw new Error("Failed to submit review.");
      }

      setFormSuccess("Thank you for sharing your experience. Your review has been added.");
      formEl.reset();
      setSelectedRating(5);
      setSelectedFiles([]);
      setSelectedPreviews([]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit review.";
      console.error("Review submission error:", err);
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="reviews" data-testid="reviews-section" className="py-32 overflow-hidden relative z-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
        .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .btn-shimmer { background: linear-gradient(90deg, #d4af37 0%, #f0e68c 25%, #d4af37 50%, #f0e68c 75%, #d4af37 100%); background-size: 1000px 100%; animation: shimmer 3s infinite; }
        .btn-shimmer:hover { animation: shimmer 1.5s infinite; }

        /* marquee styles for floating review cards */
        .marquee { overflow: hidden; }
        .marquee-track { display: flex; gap: 1rem; width: max-content; align-items: stretch; }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="mx-auto px-4 mb-16 text-center max-w-5xl">
        <div className="mb-6 inline-block">
          <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Client Reviews</h2>
          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
        </div>
        <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white mb-6">Words After the Reading</h3>
        <p className="mx-auto max-w-2xl text-foreground/60 text-base leading-relaxed">
          Share your reading experience with text, chat screenshots, or both. Your review helps future clients feel confident about their session.
        </p>
        {/* Mobile: Floating marquee with compact cards */}
        <div className="lg:hidden mx-auto mt-8 w-full">
          {reviews.length > 0 ? (
            <div className="marquee">
              <div className="marquee-track">
                {[...reviews, ...reviews].map((r, idx) => (
                  <div key={`${r.id}-mobile-${idx}`} className="min-w-[230px] max-w-[250px] p-4 rounded-xl backdrop-blur-md bg-white/[0.04] border border-primary/15">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-normal text-white truncate">{r.name}</h4>
                        <p className="text-[11px] text-primary/50">{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "fill-primary text-primary" : "text-primary/20"}`} />
                        ))}
                      </div>
                    </div>
                    {r.reviewText ? <p className="text-xs leading-normal text-foreground/70 mb-2 line-clamp-4">{r.reviewText}</p> : null}
                    {r.images && r.images.length > 0 ? <img src={r.images[0].src} alt={r.images[0].filename} className="w-full h-20 object-cover rounded" /> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-4 px-4 py-6 rounded-lg backdrop-blur-md bg-white/[0.02] border border-primary/15 text-foreground/60 text-sm text-center">No reviews yet</div>
          )}
        </div>

        {/* Desktop: Floating marquee of reviews (only visible on large screens with 3+ reviews) */}
        <div className="hidden lg:block mx-auto px-4 mt-8 w-full">
          {reviews.length >= 3 ? (
            <div className="marquee">
              <div className="marquee-track">
                {[...reviews, ...reviews].map((r, idx) => (
                  <div key={`${r.id}-${idx}`} className="min-w-[360px] max-w-[420px] p-6 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-primary/15 transform transition-transform hover:scale-105">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-base font-normal text-white">{r.name}</h4>
                        <p className="text-xs text-primary/50">{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}</p>
                      </div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "fill-primary text-primary" : "text-primary/20"}`} />)}
                      </div>
                    </div>
                    {r.reviewText ? <p className="text-sm leading-normal text-foreground/70 mb-3">{r.reviewText}</p> : null}
                    {r.images && r.images.length > 0 ? <img src={r.images[0].src} alt={r.images[0].filename} className="w-full h-36 object-cover rounded-lg" /> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="mx-auto max-w-fit flex flex-wrap justify-center gap-6">
              {reviews.map((r) => (
                <div key={r.id} className="w-[360px] p-6 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-primary/15 transform transition-transform hover:scale-105">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-base font-normal text-white">{r.name}</h4>
                      <p className="text-xs text-primary/50">{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "fill-primary text-primary" : "text-primary/20"}`} />)}
                    </div>
                  </div>
                  {r.reviewText ? <p className="text-sm leading-normal text-foreground/70 mb-3">{r.reviewText}</p> : null}
                  {r.images && r.images.length > 0 ? <img src={r.images[0].src} alt={r.images[0].filename} className="w-full h-36 object-cover rounded-lg" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-fit">
              <div className="px-6 py-8 rounded-lg backdrop-blur-md bg-white/[0.02] border border-primary/15 text-foreground/60">No reviews yet</div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto px-4 grid gap-0 lg:gap-8 lg:grid-cols-12 items-start max-w-5xl">
        {/* Left: submission form with glass-morphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 lg:border-r lg:border-primary/20 lg:pr-8 backdrop-blur-sm bg-white/[0.04] rounded-lg p-6 md:p-8"
        >
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-8 md:grid-cols-2">
              <label className="space-y-2 md:col-span-1 group">
                <span className="text-xs font-light uppercase tracking-widest text-primary/70">Name</span>
                <input 
                  name="name" 
                  required 
                  minLength={2} 
                  className="w-full bg-transparent px-0 py-2 text-white text-sm border-b border-primary/30 outline-none transition-colors focus:border-primary/80 placeholder:text-white/20" 
                  placeholder="Your name" 
                />
              </label>
              <div className="space-y-2 md:col-span-1">
                <span className="text-xs font-light uppercase tracking-widest text-primary/70">Your Rating</span>
                <div className="flex gap-1 items-center">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= selectedRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        onClick={() => setSelectedRating(star)}
                        className="p-1 transition-all duration-200 hover:scale-110"
                      >
                        <Star className={`w-6 h-6 transition-all ${active ? "fill-primary text-primary drop-shadow-lg drop-shadow-primary/50" : "text-white/25"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-light uppercase tracking-widest text-primary/70">Your Experience</span>
                <textarea 
                  name="reviewText" 
                  rows={4} 
                  className="w-full resize-none bg-transparent px-0 py-2 text-white text-sm border-b border-primary/30 outline-none transition-colors focus:border-primary/80 placeholder:text-white/20" 
                  placeholder="Share how the reading helped you..." 
                />
              </label>

              <label htmlFor="photos-upload" className={`space-y-2 md:col-span-2 cursor-pointer group relative block ${dragOver ? "bg-primary/5 border-primary/40" : ""} p-6 rounded-xl border-2 border-dashed transition-all ${dragOver ? "border-primary/40" : "border-primary/20"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
              >
                <input id="photos-upload" name="photos" type="file" accept="image/*" multiple onChange={(e) => handleFileSelect(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="text-center pointer-events-none">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-primary/50 group-hover:text-primary/70 transition-colors" />
                  <span className="text-xs font-light uppercase tracking-widest text-primary/70">Drop your photos here or browse</span>
                </div>
                <p className="text-xs text-foreground/40 text-center mt-2 pointer-events-none">Optional. JPG, PNG, WEBP up to 5MB each.</p>
              </label>

              {selectedPreviews.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light uppercase tracking-widest text-primary/70">{selectedPreviews.length} Image{selectedPreviews.length > 1 ? "s" : ""} Selected</span>
                    <button type="button" onClick={clearAllImages} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">Clear all</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-24 rounded border border-primary/20 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <span className="text-white text-xs font-bold w-5 h-5 flex items-center justify-center">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {formError ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-300">{formError}</p>
              </div>
            ) : null}
            {formSuccess ? <p className="text-sm text-emerald-300">{formSuccess}</p> : null}

            <div className="pt-4 space-y-3">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="btn-shimmer w-full rounded-full py-3 text-sm font-light uppercase tracking-widest text-[#0a0a1a] transition-all disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Share Your Experience →"}
              </button>
              <p className="text-center text-xs text-foreground/40 italic">We respect your privacy — submissions are anonymous on the site.</p>
            </div>
          </form>
        </motion.div>

        {/* Right: stats + recent reviews preview */}
        <aside className="space-y-8 lg:col-span-5 lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-primary/10">
          {/* Premium metric card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative backdrop-blur-md bg-white/[0.02] border border-primary/20 rounded-lg p-6 group hover:bg-white/[0.05] transition-colors"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <div>
              <div className="text-xs font-light uppercase tracking-widest text-primary/70 mb-2">Total Reviews</div>
              <div className="heading-luxury text-4xl text-white">{summary.totalReviews}</div>
            </div>
            <div className="mt-6 pt-6 border-t border-primary/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-light uppercase tracking-widest text-primary/70">Average Rating</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= Math.round(summary.averageRating || 5) ? "fill-primary text-primary" : "text-primary/20"}`} />)}
                </div>
              </div>
              <div className="heading-luxury text-3xl text-white">{summary.averageRating || "5.0"}</div>
              
              {/* Star distribution bar */}
              <div className="mt-4 space-y-1">
                {[5,4,3,2,1].map(stars => {
                  const count = starDistribution[stars as 1|2|3|4|5];
                  const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-primary/60 w-4">{stars}★</span>
                      <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Removed inline recent reviews list — reviews are shown in the floating marquee above */}
        </aside>
      </div>
    </section>
  );
}

export default Reviews;
