import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, CheckCircle2, X } from "lucide-react";
import { getSessionDurationFromService } from "@/lib/slotManager";
import { loadBookingDraft, parsePriceLabel, saveBookingDraft } from "@/lib/bookingCheckout";
import {
  buildAvailabilityGrid,
  getApiBaseUrl,
  getBlockSummaryLabel,
  minutesToDisplayTime,
  minutesToTime24,
  parseTimeToMinutes,
  type BookingRange,
  type TimeBlockKey,
} from "@/lib/bookingAvailability";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  dob: z.string().min(1, "Please enter your date of birth"),
  birthLocation: z.string().min(3, "Please enter your city, state, and country of birth"),
  gender: z.string().min(1, "Please select your gender"),
  maritalStatus: z.string().min(1, "Please select your marital status"),
  occupation: z.string().min(2, "Please enter your occupation"),
  service: z.string().min(1, "Please select a service"),
  duration: z.string().min(1, "Please select a duration"),
  date: z.string().min(1, "Please select a date"),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const servicePackages: Record<string, { time: string; price: string }[]> = {
  tarot: [
    { time: "Chat Session - 15 Minutes", price: "₹349" },
    { time: "Chat Session - 20 Minutes", price: "₹499" },
    { time: "Chat Session - 30 Minutes", price: "₹699" },
    { time: "Chat Session - 60 Minutes", price: "₹1,299" },
    { time: "Video Call - 30 Minutes", price: "₹999" }, 
    { time: "Video Call - 60 minutes", price: "₹1,899" },
    { time: "Call - 15 Minutes", price: "₹399" },
    { time: "Call - 20 Minutes", price: "₹549" },
    { time: "Call - 30 Minutes", price: "₹799" },
    { time: "Call - 45 Minutes", price: "₹1,199" },
    { time: "Call - 60 minutes", price: "₹1,499" },
  ],
  "spell casting & healer": [
    { time: "Consultation", price: "₹699" },
    { time: "Basic Spell", price: "₹1,499" },
    { time: "Healing Session", price: "₹1,999" },
    { time: "Premium Package", price: "₹3,499" },
  ],
  "manifestation rituals": [
    { time: "St. Expedite Ritual for Wish Fulfillment", price: "₹7,100" },
    { time: "Goddess Aphrodite Ritual (for Beauty)", price: "₹7,100" },
    { time: "Nitika Ritual for Wealth", price: "₹3,300" },
    { time: "King Clauneck Ritual", price: "₹7,100" },
    { time: "Bay Leaf Manifestation Ritual", price: "₹333" },
  ],
  "face reading & name": [
    { time: "Face Reading", price: "₹699" },
    { time: "Name Analysis", price: "₹999" },
    { time: "Combined Reading", price: "₹1,799" },
    { time: "Premium Report", price: "₹2,999" },
  ],
};

function scrollToSection(id: string): void {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Booking() {
  const today = getLocalDateString();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDurationLabel, setSelectedDurationLabel] = useState("");
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const durationMenuRef = useRef<HTMLDivElement | null>(null);
  const [isMaritalOpen, setIsMaritalOpen] = useState(false);
  const maritalMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedMarital, setSelectedMarital] = useState("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const genderMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedGender, setSelectedGender] = useState("");
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const serviceMenuRef = useRef<HTMLDivElement | null>(null);

  const [selectedBlock, setSelectedBlock] = useState<TimeBlockKey | "">("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityBookings, setAvailabilityBookings] = useState<BookingRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [slotHint, setSlotHint] = useState("");
  const [guideAvailable, setGuideAvailable] = useState(true);
  const [guideAvailabilityLoading, setGuideAvailabilityLoading] = useState(true);
  const [guideAvailabilityMessage, setGuideAvailabilityMessage] = useState("Checking guide availability...");

  const styleTag = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap');
    .heading-luxury { font-family: 'Playfair Display', serif; font-weight: 300; letter-spacing: 0.05em; }
  `;

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: today,
    },
  });

  const watchedService = watch("service");

  useEffect(() => {
    const draft = loadBookingDraft();
    if (!draft) return;

    const payload = draft.payload;
    if (typeof payload.name === "string") setValue("name", payload.name);
    if (typeof payload.email === "string") setValue("email", payload.email);
    if (typeof payload.phone === "string") setValue("phone", payload.phone);
    if (typeof payload.dob === "string") setValue("dob", payload.dob);
    if (typeof payload.birthLocation === "string") {
      setValue("birthLocation", payload.birthLocation);
    } else {
      const legacyBirthParts = [payload.cityOfBirth, payload.stateOfBirth, payload.countryOfBirth].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
      if (legacyBirthParts.length > 0) {
        setValue("birthLocation", legacyBirthParts.join(", "));
      } else if (typeof payload.placeOfBirth === "string") {
        setValue("birthLocation", payload.placeOfBirth);
      }
    }
    if (typeof payload.gender === "string") {
      setValue("gender", payload.gender);
      setSelectedGender(payload.gender);
    }
    if (typeof payload.maritalStatus === "string") {
      setValue("maritalStatus", payload.maritalStatus);
      setSelectedMarital(payload.maritalStatus);
    }
    if (typeof payload.occupation === "string") setValue("occupation", payload.occupation);
    if (typeof payload.service === "string") {
      setSelectedService(payload.service);
      setValue("service", payload.service, { shouldValidate: true, shouldDirty: true });
    }
    const slotTiming = payload.slotTiming as { timeBlock?: unknown } | undefined;
    if (typeof slotTiming?.timeBlock === "string") {
      setSelectedBlock(slotTiming.timeBlock.toLowerCase() as TimeBlockKey);
    }
    if (typeof payload.duration === "string") setValue("duration", payload.duration, { shouldValidate: true, shouldDirty: true });
    if (typeof payload.date === "string") {
      if (payload.date >= today) {
        setSelectedDate(payload.date);
        setValue("date", payload.date, { shouldValidate: true, shouldDirty: true });
      } else {
        setSelectedDate(today);
        setValue("date", today, { shouldValidate: true, shouldDirty: true });
      }
    }
    if (typeof payload.message === "string") setValue("message", payload.message);
  }, [setValue, today]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${getApiBaseUrl()}/api/guide-status`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load guide availability.");
        }

        setGuideAvailable(Boolean(json.guide?.available));
        setGuideAvailabilityMessage(String(json.guide?.message || "Guide availability updated.").trim());
      })
      .catch(() => {
        setGuideAvailable(true);
        setGuideAvailabilityMessage("");
      })
      .finally(() => {
        setGuideAvailabilityLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  // If a booking draft exists and the page is loaded (or navigated back to), scroll the booking section into view.
  useEffect(() => {
    const draft = loadBookingDraft();
    if (!draft) return;

    const scrollToBooking = () => {
      const el = document.getElementById("booking");
      if (el) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          // also focus first input for accessibility
          const firstInput = el.querySelector('input, select, textarea, button') as HTMLElement | null;
          if (firstInput) firstInput.focus({ preventScroll: true });
        } catch (err) {
          // ignore
        }
      }
    };

    // If the current hash explicitly requests booking, scroll immediately.
    if (window.location.hash === "#booking") {
      // give the layout a moment to stabilise
      setTimeout(scrollToBooking, 50);
    } else {
      // otherwise attempt a gentle scroll so users returning from payment see the form
      setTimeout(scrollToBooking, 300);
    }

    const onHash = () => { if (window.location.hash === "#booking") setTimeout(scrollToBooking, 50); };
    window.addEventListener("hashchange", onHash);

    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  // Restore visual state for custom controls when navigating back / restoring the page.
  useEffect(() => {
    const restoreFromDraft = () => {
      const draft = loadBookingDraft();
      if (!draft) return;
      const payload = draft.payload || {};
      if (typeof payload.gender === "string") setSelectedGender(payload.gender);
      if (typeof payload.maritalStatus === "string") setSelectedMarital(payload.maritalStatus);
      if (typeof payload.service === "string") {
        setSelectedService(payload.service);
        setValue("service", payload.service, { shouldValidate: true, shouldDirty: true });
      }
      if (typeof payload.duration === "string") {
        setValue("duration", payload.duration, { shouldValidate: true, shouldDirty: true });
        setSelectedDurationLabel(String(payload.duration));
      }
    };

    // When the user hits browser Back, popstate fires — restore draft values.
    window.addEventListener("popstate", restoreFromDraft);
    // Also restore when page becomes visible or focused
    const onVisibility = () => { if (!document.hidden) restoreFromDraft(); };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", restoreFromDraft);

    return () => {
      window.removeEventListener("popstate", restoreFromDraft);
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", restoreFromDraft);
    };
  }, [setValue]);

  const currentPackages = watchedService ? servicePackages[watchedService.toLowerCase()] : [];
  const selectedDuration = currentPackages.find((pkg) => pkg.time === watch("duration"));
  const selectedDurationMinutes = selectedDuration ? getSessionDurationFromService(selectedDuration.time) : 0;
  const requiresSlotSelection = watchedService?.toLowerCase() === "tarot";
  const availabilityGrid = selectedDate && selectedBlock && selectedDurationMinutes
    ? buildAvailabilityGrid({
        slotDate: selectedDate,
        blockKey: selectedBlock,
        durationMinutes: selectedDurationMinutes,
        bookings: availabilityBookings,
      })
    : [];
  const hasLiveAvailability = Boolean(selectedDate && selectedBlock && selectedDurationMinutes && !availabilityLoading && !availabilityError);
  const selectedGridCell = availabilityGrid.find((cell) => cell.time === selectedSlot);
  const isSelectedSlotAvailable = Boolean(selectedGridCell && selectedGridCell.status === "available");
  const selectedBlockSummary = selectedBlock ? getBlockSummaryLabel(selectedBlock) : "";
  const firstOpenSlot = hasLiveAvailability
    ? availabilityGrid.find((cell) => cell.status === "available")?.time || ""
    : "";
  const isPastSelectedDate = Boolean(selectedDate && selectedDate < today);
  const isBookingDisabled = guideAvailabilityLoading ? false : !guideAvailable;
  const submitButtonDisabled = isSubmitting || isBookingDisabled || (requiresSlotSelection && (availabilityLoading || !selectedDuration || !selectedDate || !selectedBlock || !selectedSlot || !isSelectedSlotAvailable));

  useEffect(() => {
    const shouldFetch = Boolean(selectedDate && selectedBlock && selectedDurationMinutes);

    if (!shouldFetch || isPastSelectedDate) {
      setAvailabilityBookings([]);
      setAvailabilityLoading(false);
      setAvailabilityError(isPastSelectedDate ? "Please select today or a future date." : "");
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError("");

    const controller = new AbortController();

    fetch(
      `${getApiBaseUrl()}/api/bookings/availability?date=${encodeURIComponent(selectedDate)}&timeBlock=${encodeURIComponent(selectedBlock)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load availability.");
        }

        return json.bookings as BookingRange[];
      })
      .then((bookings) => {
        if (cancelled) return;
        setAvailabilityBookings(bookings || []);
        setAvailabilityLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setAvailabilityBookings([]);
        setAvailabilityLoading(false);
        const message = error instanceof Error ? error.message : "Unable to load availability.";
        setAvailabilityError(message === "Failed to fetch" ? "Unable to reach booking server. Please try again in a moment." : message);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedDate, selectedBlock, selectedDurationMinutes, isPastSelectedDate]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (isBookingDisabled) {
        alert(guideAvailabilityMessage || "Guide is not available today. Please try again later.");
        return;
      }

      if (isPastSelectedDate) {
        alert("Please select today or a future date.");
        return;
      }

      if (!selectedDuration) {
        alert("Please select a package before continuing to payment.");
        return;
      }

      if (requiresSlotSelection && (!selectedDate || !selectedBlock || !selectedSlot)) {
        alert("Please choose a date, time block, and available slot before continuing.");
        return;
      }

      if (requiresSlotSelection && availabilityError) {
        alert("Unable to reach booking server. Please wait a moment and try again.");
        return;
      }

      if (requiresSlotSelection && !isSelectedSlotAvailable) {
        alert(slotHint || "This slot is unavailable. Please select another time.");
        return;
      }

      const amount = parsePriceLabel(selectedDuration.price);
      if (!amount) {
        alert("Unable to determine the payment amount for this package.");
        return;
      }

      if (requiresSlotSelection) {
        const validateResponse = await fetch(`${getApiBaseUrl()}/api/bookings/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            timeBlock: selectedBlock,
            startTime: selectedSlot,
            durationMinutes: selectedDurationMinutes,
          }),
        });

        const validateJson = await validateResponse.json().catch(() => null);
        if (!validateResponse.ok || !validateJson?.available) {
          const nextSlot = validateJson?.nextAvailableSlot ? minutesToDisplayTime(parseTimeToMinutes(validateJson.nextAvailableSlot) ?? 0) : "";
          setSlotHint(
            nextSlot
              ? `This slot is unavailable. The next available slot is ${nextSlot}.`
              : "This slot is unavailable. Please select another time.",
          );
          return;
        }
      }

      const bookingData: any = {
        ...data,
        _subject: `New Booking Request — ${data.service} ${data.duration} — ${data.name}`,
        slotTiming: requiresSlotSelection
          ? {
              date: selectedDate,
              timeBlock: selectedBlock,
              startTime: selectedSlot,
              endTime: minutesToTime24((parseTimeToMinutes(selectedSlot) || 0) + selectedDurationMinutes),
              bufferEndTime: minutesToTime24((parseTimeToMinutes(selectedSlot) || 0) + selectedDurationMinutes + 5),
              durationMinutes: selectedDurationMinutes,
            }
          : undefined,
      };

      saveBookingDraft({
        payload: {
          ...bookingData,
          paymentAmount: amount,
          paymentStatus: "PENDING",
        },
        amount,
        amountLabel: selectedDuration.price,
        serviceLabel: data.service,
        durationLabel: data.duration,
        createdAt: new Date().toISOString(),
        slotTiming: bookingData.slotTiming,
      });

      try {
        const basePath = String(import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
        const normalized = `${window.location.origin}${basePath}${"/#booking"}`;
        window.history.replaceState(null, "", normalized);
      } catch (err) {
        // ignore history exceptions
      }

      navigate("/payment");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      if (message === "Failed to fetch") {
        alert("Unable to reach booking server. Please check connection and try again.");
      } else {
        alert("There was a problem submitting your request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextService = e.target.value;
    setSelectedService(nextService);
    setValue("service", nextService, { shouldValidate: true, shouldDirty: true });
    setValue("duration", "", { shouldValidate: true, shouldDirty: true });
    setIsDurationOpen(false);
    // Reset slot and date when service changes
    setSelectedSlot("");
    setSelectedDate("");
    setSelectedBlock("");
    setAvailabilityBookings([]);
    setSlotHint("");
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (durationMenuRef.current && !durationMenuRef.current.contains(event.target as Node)) {
        setIsDurationOpen(false);
      }
      if (maritalMenuRef.current && !maritalMenuRef.current.contains(event.target as Node)) {
        setIsMaritalOpen(false);
      }
      if (genderMenuRef.current && !genderMenuRef.current.contains(event.target as Node)) {
        setIsGenderOpen(false);
      }
      if (serviceMenuRef.current && !serviceMenuRef.current.contains(event.target as Node)) {
        setIsServiceOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

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
            <div className="h-px bg-linear-to-r from-transparent via-primary to-transparent"></div>
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

          {isBookingDisabled ? (
            <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {guideAvailabilityMessage || "Guide is not available today. Booking is temporarily disabled."}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <fieldset disabled={isBookingDisabled} className="space-y-6">
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
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Email Address</label>
                <input 
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  data-testid="input-email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="jane@example.com"
                />
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">WhatsApp Number</label>
                <input 
                  {...register("phone")}
                  type="tel"                                                                                                
                  inputMode="tel"
                  data-testid="input-phone"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Date of Birth</label>
                <input 
                  {...register("dob")}
                  type="date"
                  data-testid="input-dob"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                {errors.dob && <p className="text-destructive text-sm mt-1">{errors.dob.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Birth Place</label>
                <input
                  {...register("birthLocation")}
                  data-testid="input-birth-location"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="City, State, Country of Birth"
                />
                {errors.birthLocation && <p className="text-destructive text-sm mt-1">{errors.birthLocation.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Gender</label>
                <div className="relative" ref={genderMenuRef}>
                  <input type="hidden" {...register("gender")} />
                  <button
                    type="button"
                    data-testid="select-gender"
                    aria-expanded={isGenderOpen}
                    onClick={() => setIsGenderOpen((open) => !open)}
                    className="w-full flex items-center justify-between gap-4 bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-left text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  >
                    <span className={selectedGender ? "text-white" : "text-white/50"}>{selectedGender || "Select gender..."}</span>
                    <span className="text-primary/60" />
                  </button>

                  {isGenderOpen && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b18] shadow-2xl backdrop-blur-sm">
                      <div className="py-2">
                        {["Female", "Male", "Other", "Prefer not to say"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedGender(opt);
                              setValue("gender", opt, { shouldValidate: true, shouldDirty: true });
                              setIsGenderOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
                          >
                            <span className="text-sm sm:text-base text-white">{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.gender && <p className="text-destructive text-sm mt-1">{errors.gender.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Marital Status</label>
                <div className="relative" ref={maritalMenuRef}>
                  <button
                    type="button"
                    data-testid="select-marital-status"
                    aria-expanded={isMaritalOpen}
                    onClick={() => setIsMaritalOpen((open) => !open)}
                    className="w-full flex items-center justify-between gap-4 bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-left text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  >
                    <span className={selectedMarital ? "text-white" : "text-white/50"}>{selectedMarital || "Select marital status..."}</span>
                    <span className="text-primary/60">{selectedMarital ? "" : ""}</span>
                  </button>

                  {isMaritalOpen && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b18] shadow-2xl backdrop-blur-sm">
                      <div className="py-2">
                        {[
                          "Single",
                          "Relationship",
                          "Married",
                          "Divorced",
                          "Widowed",
                          "Separated",
                        ].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setSelectedMarital(option);
                              setValue("maritalStatus", option, { shouldValidate: true, shouldDirty: true });
                              setIsMaritalOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
                          >
                            <span className="text-sm sm:text-base text-white">{option}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.maritalStatus && <p className="text-destructive text-sm mt-1">{errors.maritalStatus.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Occupation</label>
                <input 
                  {...register("occupation")}
                  data-testid="input-occupation"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Your profession"
                />
                {errors.occupation && <p className="text-destructive text-sm mt-1">{errors.occupation.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Service Type</label>
                <div className="relative" ref={serviceMenuRef}>
                  <input type="hidden" {...register("service")} />
                  <button
                    type="button"
                    data-testid="select-service"
                    aria-expanded={isServiceOpen}
                    onClick={() => setIsServiceOpen((open) => !open)}
                    className="w-full flex items-center justify-between gap-4 bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-left text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  >
                    <span className={selectedService ? "text-white" : "text-white/50"}>{selectedService || "Select a service..."}</span>
                    <span className="text-primary/60" />
                  </button>

                  {isServiceOpen && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b18] shadow-2xl backdrop-blur-sm">
                      <div className="py-2">
                        {[
                          { value: "Tarot", label: "Tarot Reading" },
                          { value: "Spell Casting & Healer", label: "Spell Casting & Healer" },
                          { value: "Manifestation Rituals", label: "Manifestation Rituals" },
                          { value: "Face Reading & Name", label: "Face Reading & Name Correction" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedService(opt.value);
                              setValue("service", opt.value, { shouldValidate: true, shouldDirty: true });
                              // reset duration when service changes
                              setValue("duration", "", { shouldValidate: true, shouldDirty: true });
                              setIsDurationOpen(false);
                              setSelectedBlock("");
                              setSelectedSlot("");
                              setAvailabilityBookings([]);
                              setSlotHint("");
                              setIsServiceOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
                          >
                            <span className="text-sm sm:text-base text-white">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.service && <p className="text-destructive text-sm mt-1">{errors.service.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Session Duration / Package</label>
                <input type="hidden" {...register("duration")} />
                <div className="relative" ref={durationMenuRef}>
                  <button
                    type="button"
                    data-testid="select-duration"
                    disabled={!selectedService}
                    aria-expanded={isDurationOpen}
                    onClick={() => setIsDurationOpen((open) => !open)}
                    className="w-full flex items-center justify-between gap-4 bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-left text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className={selectedDuration || selectedDurationLabel ? "text-white" : "text-white/50"}>
                      {selectedDuration ? selectedDuration.time : selectedDurationLabel || "Select duration / package..."}
                    </span>
                    <span className={selectedDuration ? "text-primary font-semibold whitespace-nowrap" : "text-primary/60 whitespace-nowrap"}>
                      {selectedDuration ? selectedDuration.price : ""}
                    </span>
                  </button>

                  {isDurationOpen && selectedService && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b18] shadow-2xl backdrop-blur-sm">
                      <div className="max-h-72 overflow-y-auto">
                        {currentPackages.map((pkg) => {
                          const isSelected = watch("duration") === pkg.time;

                          return (
                            <button
                              key={pkg.time}
                              type="button"
                              onClick={() => {
                                setValue("duration", pkg.time, { shouldValidate: true, shouldDirty: true });
                                setSelectedDurationLabel(pkg.time);
                                setIsDurationOpen(false);
                                setSelectedSlot("");
                                setSlotHint("");
                              }}
                              className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                                isSelected ? "bg-primary/10" : ""
                              }`}
                            >
                              <span className="text-sm sm:text-base text-white">{pkg.time}</span>
                              <span className="text-sm sm:text-base font-semibold text-white/70 whitespace-nowrap">{pkg.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {errors.duration && <p className="text-destructive text-sm mt-1">{errors.duration.message}</p>}
              </div>

              {/* Preferred Date + Live Timeline for Tarot */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Preferred Date</label>
                <input 
                  {...register("date")}
                  type="date"
                  min={today}
                  defaultValue={today}
                  data-testid="input-date"
                  onChange={(e) => {
                    const nextDate = e.target.value >= today ? e.target.value : today;
                    if (nextDate !== e.target.value) {
                      e.target.value = nextDate;
                    }

                    setValue("date", nextDate, { shouldValidate: true, shouldDirty: true });
                    setSelectedDate(nextDate);
                    setSelectedSlot("");
                    setSelectedBlock("");
                    setAvailabilityBookings([]);
                    setSlotHint("");
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
              </div>

              {watchedService && watchedService.toLowerCase() === "tarot" && watch("duration") && (
                <div className="md:col-span-2 space-y-4">
                  <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Choose Time Block</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["morning", "noon", "evening"] as TimeBlockKey[]).map((blockKey) => {
                      const isActive = selectedBlock === blockKey;
                      const blockGrid = isActive && selectedDate && selectedDurationMinutes
                        ? buildAvailabilityGrid({
                            slotDate: selectedDate,
                            blockKey,
                            durationMinutes: selectedDurationMinutes,
                            bookings: availabilityBookings,
                          })
                        : [];
                      const openSlot = blockGrid.find((cell) => cell.status === "available")?.time || "";

                      return (
                        <button
                          key={blockKey}
                          type="button"
                          onClick={() => {
                            setSelectedBlock(blockKey);
                            setSelectedSlot("");
                            setSlotHint("");
                          }}
                          className={`rounded-xl border p-4 text-left transition-all ${isActive ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {blockKey === "morning" ? "Morning (9:00 AM - 12:00 PM)" : blockKey === "noon" ? "Noon (2:00 PM - 5:00 PM)" : "Evening (7:00 PM - 11:00 PM)"}
                              </div>
                              <div className="text-xs text-white/70 mt-1">
                                {isActive
                                  ? selectedDate && selectedDurationMinutes
                                    ? openSlot
                                      ? `Next open slot: ${minutesToDisplayTime(parseTimeToMinutes(openSlot) ?? 0)}`
                                      : availabilityLoading
                                        ? "Checking availability..."
                                        : "No open slots in this block"
                                    : "Select a date and duration first"
                                  : "Tap to check live availability"}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                              {getBlockSummaryLabel(blockKey)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#080812] px-4 py-3 text-sm text-white/85">
                    {selectedBlock ? (
                      <span>
                        {selectedBlockSummary || "Time block selected"}.
                        {selectedDate && selectedDurationMinutes > 0
                          ? " Live slots are loading below."
                          : " Pick a date and duration to load live slots."}
                      </span>
                    ) : (
                      <span>Select a time block to continue.</span>
                    )}
                  </div>

                  {selectedBlock && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 space-y-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">{selectedBlockSummary}</div>
                          <div className="text-xs text-white/70">
                            {!selectedDate || !selectedDurationMinutes
                              ? "Select a date and duration to load live slots."
                              : availabilityLoading
                                ? "Checking live availability..."
                                : availabilityError
                                  ? availabilityError
                                  : slotHint || "Select a green slot to continue."}
                          </div>
                        </div>
                        {selectedDate && selectedDurationMinutes > 0 && firstOpenSlot && (
                          <div className="text-xs uppercase tracking-[0.2em] text-primary/80">
                            Next open slot: {minutesToDisplayTime(parseTimeToMinutes(firstOpenSlot) ?? 0)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-white/70">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
                          Open
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-300/90" />
                          Booked
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
                          Buffer
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
                          Blocked
                        </span>
                      </div>

                      {selectedDate && selectedDurationMinutes > 0 ? (
                        availabilityError ? (
                          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
                            Live slots could not be loaded right now. Please retry in a moment.
                          </div>
                        ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2 max-h-80 overflow-y-auto pr-1">
                          {availabilityGrid.map((cell) => {
                            const isSelected = selectedSlot === cell.time;
                            const isAvailable = cell.status === "available";
                            const isBuffer = cell.status === "buffer";
                            const unavailableLabel = `Unavailable. Next open slot: ${cell.nextAvailableSlot ? minutesToDisplayTime(parseTimeToMinutes(cell.nextAvailableSlot) ?? 0) : "none"}.`;

                            return (
                              <button
                                key={cell.time}
                                type="button"
                                title={isAvailable ? "Available" : unavailableLabel}
                                onClick={() => {
                                  if (!isAvailable) {
                                    setSlotHint(unavailableLabel);
                                    return;
                                  }

                                  setSelectedSlot(cell.time);
                                  setSlotHint("This slot is available!");
                                }}
                                className={`rounded-xl border px-2 py-2 sm:px-3 sm:py-3 text-left transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/15 text-white"
                                    : cell.status === "available"
                                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/20"
                                      : cell.status === "booked"
                                        ? "border-red-400/30 bg-red-400/10 text-red-100"
                                        : isBuffer
                                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                                          : "border-white/10 bg-white/5 text-white/55"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs sm:text-sm font-semibold">{cell.displayTime}</div>
                                  <span
                                    className={`h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full ${
                                      cell.status === "available"
                                        ? "bg-emerald-300/90"
                                        : cell.status === "booked"
                                          ? "bg-red-300/90"
                                          : isBuffer
                                            ? "bg-amber-300/90"
                                            : "bg-white/55"
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        )
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm text-white/70">
                          Choose a date and duration to load the live slot grid for this block.
                        </div>
                      )}

                    </div>
                  )}

                  {availabilityError && (
                    <p className="text-destructive text-sm">{availabilityError}</p>
                  )}
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Message or Focus Area (Optional)</label>
                <textarea 
                  {...register("message")}
                  data-testid="input-message"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  placeholder="What brings you to seek guidance ?"
                ></textarea>
              </div>
            </div>

            <div className="text-center">
              <button 
                type="submit"
                disabled={submitButtonDisabled}
                data-testid="button-submit"
                className={`w-full sm:w-auto inline-flex px-6 sm:px-12 py-4 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest text-sm sm:text-base transition-all duration-300 shadow-[0_0_20px_rgba(201,168,76,0.3)] items-center justify-center gap-2 mx-auto ${submitButtonDisabled ? "opacity-70 cursor-not-allowed" : "hover:bg-white hover:text-[#0a0a1a] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"}`}
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
            </fieldset>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-[#0a0a1a]/80 backdrop-blur-sm p-4"
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
                Thank you, <span className="text-primary font-bold">{submittedName}</span>! Your booking request has been received. A confirmation email will be sent shortly.
              </p>
              
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold uppercase tracking-widest transition-all duration-300"
              >
                Return to the stars
              </button>

              <button
                type="button"
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
