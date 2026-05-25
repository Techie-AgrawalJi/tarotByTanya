import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import {
  formatReviewCount,
  readCachedReviews,
  REVIEW_COUNT_UPDATED_EVENT,
  writeCachedReviews,
} from "@/lib/review-count";
import { getApiBaseUrl } from "@/lib/api-base-url";

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

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
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
  const cachedReviews = readCachedReviews();
  const [reviews, setReviews] = useState<ReviewRecord[]>(() =>
    Array.isArray(cachedReviews?.reviews) ? (cachedReviews.reviews as ReviewRecord[]) : [],
  );
  const [summary, setSummary] = useState(() => ({
    totalReviews: cachedReviews?.summary?.totalReviews ?? 0,
    averageRating: cachedReviews?.summary?.averageRating ?? 0,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);
  const [viewer, setViewer] = useState<{ images: ReviewImage[]; currentIndex: number } | null>(null);
  const [viewerDirection, setViewerDirection] = useState<1 | -1>(1);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function getReviewTextValue(formEl: HTMLFormElement): string {
    const field = formEl.elements.namedItem("reviewText");

    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      return field.value.trim();
    }

    return "";
  }

  function isReviewTextLongEnough(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    return wordCount >= 10;
  }

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

  async function compressImage(file: File, maxWidth = 1400, quality = 0.78): Promise<File> {
    try {
      if (!file.type.startsWith('image/')) return file;

      // use createImageBitmap when available for better performance
      let bitmap: ImageBitmap | HTMLCanvasElement;
      if (typeof (window as any).createImageBitmap === 'function') {
        bitmap = await (window as any).createImageBitmap(file);
      } else {
        // fallback: load image and draw to canvas
        bitmap = await new Promise<HTMLCanvasElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              resolve(canvas);
            } catch (err) { reject(err); }
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      }

      // determine target dimensions
      const origWidth = (bitmap as any).width || (bitmap as any).naturalWidth;
      const origHeight = (bitmap as any).height || (bitmap as any).naturalHeight;
      let targetWidth = origWidth;
      let targetHeight = origHeight;
      if (origWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round((maxWidth * origHeight) / origWidth);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      // draw the bitmap onto canvas
      if (bitmap instanceof ImageBitmap) {
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      } else {
        // fallback when bitmap is actually an HTMLCanvasElement from fallback above
        ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, targetWidth, targetHeight);
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) return file;
      const outFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      return outFile;
    } catch (err) {
      // on any failure, return original file so submission still works
      console.warn('Image compression failed, sending original file', err);
      return file;
    }
  }

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setSelectedFiles([]);
    setSelectedPreviews([]);
  };

  function openImageViewer(images: ReviewImage[], currentIndex: number): void {
    setViewerDirection(1);
    setViewer({ images, currentIndex });
  }

  function closeImageViewer(): void {
    setViewer(null);
  }

  function stepImageViewer(direction: 1 | -1): void {
    setViewerDirection(direction);
    setViewer((current) => {
      if (!current) return current;

      const total = current.images.length;
      return {
        ...current,
        currentIndex: (current.currentIndex + direction + total) % total,
      };
    });
  }

  function toggleReviewExpansion(reviewId: string): void {
    setExpandedReviewIds((current) => ({
      ...current,
      [reviewId]: !current[reviewId],
    }));
  }

  function isLongReview(reviewText: string): boolean {
    return reviewText.trim().split(/\s+/).filter(Boolean).length > 28;
  }

  function ReviewMediaPreview({ images, reviewName }: { images: ReviewImage[]; reviewName: string }) {
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openImageViewer(images, 0);
          }}
          className="group relative block w-full overflow-hidden rounded-[1.15rem] border border-[#5d4aa5]/18 bg-[linear-gradient(180deg,rgba(25,19,54,0.92)_0%,rgba(15,14,36,0.95)_100%)] text-left shadow-[0_12px_28px_rgba(4,5,18,0.28)] transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-[#07111f]"
          aria-label={`Open image for ${reviewName}`}
        >
          <div className="relative h-28 w-full overflow-hidden sm:h-32 md:h-36">
            <img
              src={images[0].src}
              alt={images[0].filename || `${reviewName} image 1`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        </button>
      );
    }

    const deckImages = images.slice(0, 3);

    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openImageViewer(images, 0);
        }}
        className="group relative block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-[#07111f]"
        aria-label={`Open ${images.length} photos for ${reviewName}`}
      >
        <div className="relative h-28 w-full overflow-visible sm:h-32 md:h-36">
          {deckImages.slice(1).map((image, index) => {
            const layerOffset = index === 0 ? 0.55 : 0.95;
            const rotation = index === 0 ? -5 : 7;

            return (
              <div
                key={image.id}
                className="absolute inset-0 rounded-[1.15rem] border border-[#5d4aa5]/16 bg-[linear-gradient(180deg,rgba(25,19,54,0.88)_0%,rgba(15,14,36,0.94)_100%)] shadow-[0_14px_34px_rgba(4,5,18,0.22)]"
                style={{
                  transform: `translate(${layerOffset}rem, ${layerOffset * 0.55}rem) rotate(${rotation}deg) scale(${0.985 - index * 0.025})`,
                  zIndex: 10 - index,
                }}
              >
                <img
                  src={image.src}
                  alt={image.filename || `${reviewName} photo ${index + 2}`}
                  className="h-full w-full rounded-[1.15rem] object-cover opacity-90"
                />
                <div className="absolute inset-0 rounded-[1.15rem] bg-linear-to-t from-black/25 via-transparent to-transparent" />
              </div>
            );
          })}

          <div className="absolute inset-0 z-20 overflow-hidden rounded-[1.15rem] border border-[#5d4aa5]/18 bg-[linear-gradient(180deg,rgba(25,19,54,0.9)_0%,rgba(15,14,36,0.96)_100%)] shadow-[0_16px_36px_rgba(4,5,18,0.26)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.01]">
            <img
              src={images[0].src}
              alt={images[0].filename || `${reviewName} photo 1`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#10122a]/82 via-[#10122a]/24 to-transparent" />
            <div className="absolute left-2.5 top-2.5 rounded-full border border-white/10 bg-[#12142c]/68 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/76 backdrop-blur">
              Tap to view
            </div>
            <div className="absolute right-2.5 bottom-2.5 rounded-full border border-white/10 bg-[#12142c]/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/84 backdrop-blur">
              +{images.length - 1} photos
            </div>
          </div>
        </div>
      </button>
    );
  }

  const starDistribution = useMemo(() => {
    if (reviews.length === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { dist[r.rating as 1|2|3|4|5]++; });
    return dist;
  }, [reviews]);

  const totalReviews = summary.totalReviews ?? 0;
  const averageRating = summary.averageRating ?? 0;
  const sliderReviews = reviews.length > 1 ? [...reviews, ...reviews] : reviews;

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
          writeCachedReviews({ reviews: data.reviews ?? [], summary: data.summary ?? { totalReviews: 0, averageRating: 0 } });
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

  function ReviewCard({ review, index }: { review: ReviewRecord; index: number }) {
    const reviewText = review.reviewText?.trim() ?? "";
    const isExpanded = expandedReviewIds[review.id] ?? false;
    const showReadMore = reviewText.length > 0 && isLongReview(reviewText);
    const floatOffset = index % 2 === 0 ? -6 : 6;

    return (
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        animate={{ y: [0, floatOffset, 0] }}
        transition={{
          opacity: { duration: 0.35 },
          y: {
            duration: 6.5 + index * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
            repeatType: "mirror",
            delay: index * 0.12,
          },
        }}
        viewport={{ once: true, margin: "-40px" }}
        className="group flex h-full min-h-72 w-66 shrink-0 flex-col overflow-hidden rounded-[1.55rem] border border-[#5d4aa5]/18 bg-[linear-gradient(180deg,rgba(25,19,54,0.88)_0%,rgba(15,14,36,0.95)_100%)] p-3 shadow-[0_16px_40px_rgba(4,5,18,0.24)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#7a67c4]/24 hover:shadow-[0_22px_52px_rgba(4,5,18,0.34)] sm:w-70 sm:p-4 md:w-74"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-medium text-white sm:text-base">{review.name}</h4>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-primary/55 sm:text-[11px]">
              {review.createdAt ? format(new Date(review.createdAt), "MMM d, yyyy") : ""}
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-[#5d4aa5]/18 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1">
            <StarRating rating={review.rating} />
          </div>
        </div>

        <div className="mt-3 flex-1">
          {reviewText ? (
            <p
              className={`text-sm leading-6 text-white/72 ${isExpanded ? "" : "line-clamp-3"}`}
            >
              {reviewText}
            </p>
          ) : (
            <p className="text-sm leading-6 text-white/44 italic">No written review was provided.</p>
          )}

          {showReadMore ? (
            <button
              type="button"
              onClick={() => toggleReviewExpansion(review.id)}
              className="mt-2 text-sm font-medium text-primary/90 transition-colors hover:text-primary"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>

        <div className="mt-3">
          <ReviewMediaPreview images={review.images} reviewName={review.name} />
        </div>
      </motion.article>
    );
  }

  useEffect(() => {
    if (!viewer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeImageViewer();
        return;
      }

      if (event.key === "ArrowLeft") {
        stepImageViewer(-1);
      }

      if (event.key === "ArrowRight") {
        stepImageViewer(1);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewer]);

  useEffect(() => {
    if (!viewer) {
      setTouchStartX(null);
    }
  }, [viewer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    const formEl = event.currentTarget as HTMLFormElement;

    const formData = new FormData(formEl);
    formData.set("rating", String(selectedRating));

    const reviewTextValue = getReviewTextValue(formEl);

    if (selectedRating < 1) {
      setFormError("Please select a rating before submitting your review.");
      setIsSubmitting(false);
      return;
    }

    if (!isReviewTextLongEnough(reviewTextValue)) {
      setFormError("Please write at least 10 words about your experience.");
      setIsSubmitting(false);
      return;
    }

    // compress images in parallel before upload to reduce payload size & time
    formData.delete("photos");
    if (selectedFiles.length > 0) {
      const compressed = await Promise.all(selectedFiles.map((f) => compressImage(f, 1400, 0.78)));
      compressed.forEach((file) => formData.append("photos", file));
    }

    try {
      const response = await fetch(apiUrl("/api/reviews"), {
        method: "POST",
        body: formData,
      });

      let payload: { message?: string; review?: ReviewRecord } | null = null;
      let errorMessage = "";

      try {
        const text = await response.text();
        payload = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", parseErr);
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

      if (!response.ok) {
        const finalErrorMessage = payload?.message || errorMessage || "Unable to submit review. Please try again.";
        throw new Error(finalErrorMessage);
      }

      const createdReview = payload?.review;

      if (createdReview) {
        const nextTotalReviews = (summary.totalReviews ?? 0) + 1;
        const nextReviews = [createdReview, ...reviews];
        const nextSummary = (() => {
          const prev = summary ?? { totalReviews: 0, averageRating: 0 };
          const total = (prev.totalReviews ?? 0) + 1;
          const avg = Number(
            ((((prev.averageRating ?? 0) * (prev.totalReviews ?? 0)) + (createdReview.rating ?? 0)) /
              total).toFixed(1),
          );

          return { totalReviews: total, averageRating: avg };
        })();

        setReviews(nextReviews);
        setSummary(nextSummary);
        writeCachedReviews({ reviews: nextReviews, summary: nextSummary });
        window.dispatchEvent(
          new CustomEvent(REVIEW_COUNT_UPDATED_EVENT, {
            detail: { totalReviews: nextTotalReviews },
          }),
        );
      } else {
        throw new Error("Failed to submit review.");
      }

      setFormSuccess("Thank you for sharing your experience. Your review has been added.");
      formEl.reset();
      setSelectedRating(0);
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
    <section id="reviews" data-testid="reviews-section" className="py-16 md:py-32 overflow-hidden relative z-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
        .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .btn-shimmer { background: linear-gradient(90deg, #d4af37 0%, #f0e68c 25%, #d4af37 50%, #f0e68c 75%, #d4af37 100%); background-size: 1000px 100%; animation: shimmer 3s infinite; }
        .btn-shimmer:hover { animation: shimmer 1.5s infinite; }

        @keyframes review-slider {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .review-slider-track {
          display: flex;
          width: max-content;
          gap: 1rem;
          align-items: stretch;
          animation: review-slider 52s linear infinite;
        }
        .review-slider-track:hover {
          animation-play-state: paused;
        }

      `}</style>
      <div className="mx-auto px-4 mb-16 text-center max-w-5xl">
        <div className="mb-6 inline-block">
          <h2 className="text-sm font-normal tracking-[0.2em] text-primary/80 uppercase mb-3">Client Reviews</h2>
          <div className="h-px bg-linear-to-r from-transparent via-primary to-transparent"></div>
        </div>
        <h3 className="heading-luxury text-4xl sm:text-5xl md:text-6xl text-white mb-6">Words After the Reading</h3>
        <p className="mx-auto max-w-2xl text-foreground/60 text-base leading-relaxed">
          Share your reading experience with text, chat screenshots, or both. Your review helps future clients feel confident about their session.
        </p>

        <div className="mx-auto mt-8 w-full overflow-hidden">
          {reviews.length > 0 ? (
            <div className="review-slider-track py-2">
              {sliderReviews.map((review, index) => (
                <ReviewCard key={`${review.id}-${index}`} review={review} index={index} />
              ))}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(11,10,22,0.82)_0%,rgba(8,8,18,0.9)_100%)] px-6 py-10 text-center text-foreground/60 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              No reviews yet
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
          className="lg:col-span-7 lg:border-r lg:border-primary/20 lg:pr-8 backdrop-blur-sm bg-white/4 rounded-lg p-6 md:p-8"
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
                  required
                  minLength={50}
                  aria-describedby="reviewText-help"
                  className="w-full resize-none bg-transparent px-0 py-2 text-white text-sm border-b border-primary/30 outline-none transition-colors focus:border-primary/80 placeholder:text-white/20" 
                  placeholder="Share how the reading helped you..." 
                />
                <p id="reviewText-help" className="text-[11px] text-foreground/45">
                  Please write at least 50 characters or 10 words.
                </p>
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
            className="relative backdrop-blur-md bg-white/2 border border-primary/20 rounded-lg p-6 group hover:bg-white/5 transition-colors"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent"></div>
            <div>
              <div className="text-xs font-light uppercase tracking-widest text-primary/70 mb-2">Total Reviews</div>
                <div className="heading-luxury text-4xl text-white">{formatReviewCount(totalReviews)}</div>
            </div>
            <div className="mt-6 pt-6 border-t border-primary/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-light uppercase tracking-widest text-primary/70">Average Rating</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= Math.round(averageRating) ? "fill-primary text-primary" : "text-primary/20"}`} />)}
                </div>
              </div>
              <div className="heading-luxury text-3xl text-white">{totalReviews > 0 ? averageRating.toFixed(1) : "0"}</div>
              
              {/* Star distribution bar */}
              <div className="mt-4 space-y-1">
                {[5,4,3,2,1].map(stars => {
                  const count = starDistribution[stars as 1|2|3|4|5];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-primary/60 w-4">{stars}★</span>
                      <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <div className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

        </aside>
      </div>

      {viewer ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review image viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeImageViewer();
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeImageViewer();
            }}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur transition-colors hover:bg-white/20"
            aria-label="Close image viewer"
          >
            ×
          </button>

          <div
            className="relative flex w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              const startX = touchStartX;
              if (startX === null) return;

              const endX = event.changedTouches[0]?.clientX ?? startX;
              const delta = endX - startX;

              if (Math.abs(delta) > 40) {
                stepImageViewer(delta > 0 ? -1 : 1);
              }

              setTouchStartX(null);
            }}
          >
            {viewer.images.length > 1 ? (
              <button
                type="button"
                onClick={() => stepImageViewer(-1)}
                className="absolute left-0 sm:-left-14 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
            ) : null}

            <figure className="flex w-full max-w-5xl flex-col items-center gap-3">
              <div className="flex w-full items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={`${viewer.currentIndex}-${viewer.images[viewer.currentIndex]?.id ?? "image"}`}
                    src={viewer.images[viewer.currentIndex]?.src}
                    alt={viewer.images[viewer.currentIndex]?.filename || "Review image"}
                    className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                    initial={{ opacity: 0, x: viewerDirection > 0 ? 80 : -80, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: viewerDirection > 0 ? -80 : 80, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  />
                </AnimatePresence>
              </div>
              <figcaption className="flex w-full items-center justify-between gap-3 text-sm text-white/80">
                <span>
                  {viewer.currentIndex + 1} / {viewer.images.length}
                </span>
                <span className="truncate text-right">{viewer.images[viewer.currentIndex]?.filename}</span>
              </figcaption>
            </figure>

            {viewer.images.length > 1 ? (
              <button
                type="button"
                onClick={() => stepImageViewer(1)}
                className="absolute right-0 sm:-right-14 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default Reviews;
