export const REVIEW_COUNT_UPDATED_EVENT = "review-count-updated";
export const REVIEWS_CACHE_KEY = "tarot-review-cache";

export type ReviewCache = {
  reviews?: unknown[];
  summary?: {
    totalReviews?: number;
    averageRating?: number;
  };
};

export function formatReviewCount(totalReviews: number): string {
  if (totalReviews < 25) {
    return String(totalReviews);
  }

  const rounded = Math.floor(totalReviews / 25) * 25;
  return `${rounded}+`;
}

export function readCachedReviewSummary(): ReviewCache["summary"] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(REVIEWS_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as ReviewCache;
    return parsed.summary ?? null;
  } catch {
    return null;
  }
}

export function readCachedReviews(): ReviewCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(REVIEWS_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as ReviewCache;
  } catch {
    return null;
  }
}

export function writeCachedReviews(cache: ReviewCache): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures and fall back to network state.
  }
}
