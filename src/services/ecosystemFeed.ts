import { useCallback, useEffect, useState } from "react";

export interface FeaturedPromo {
  id: string;
  badge: string;
  title: string;
  description: string;
  cta_text: string;
  url: string;
}

export interface EcosystemProject {
  id: string;
  title: string;
  tagline: string;
  badge: string;
  url: string;
  is_new: boolean;
}

export interface EcosystemFeed {
  latest_version: string;
  download_url: string;
  featured_promo: FeaturedPromo;
  projects: EcosystemProject[];
}

export const CURRENT_MOLVA_VERSION = "1.0.0";
const FEED_ENDPOINT = "https://molva.brand4e.bg/api/feed.php";
const CACHE_KEY = "molva_ecosystem_feed_v2";
const SEEN_PROJECTS_KEY = "molva_seen_project_ids_v1";
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const DEFAULT_ECOSYSTEM_FEED: EcosystemFeed = {
  latest_version: CURRENT_MOLVA_VERSION,
  download_url: "https://molva.brand4e.bg",
  featured_promo: {
    id: "promo-give-brand4e-v1",
    badge: "FROM THE CREATOR",
    title: "Give by Brand4e",
    description:
      "Fast, simple & free giveaways, raffles and community tools by Brand4e.",
    cta_text: "Try it free →",
    url: "https://give.brand4e.bg/?src=sidebar",
  },
  projects: [
    {
      id: "molva-desktop",
      title: "Molva Desktop",
      tagline:
        "Zero-Electron, ultra-lightweight messenger & workspace shell for Windows.",
      badge: "OPEN SOURCE",
      url: "https://molva.brand4e.bg",
      is_new: false,
    },
    {
      id: "give-brand4e",
      title: "Give by Brand4e",
      tagline:
        "Create, manage and share giveaways & community picks effortlessly.",
      badge: "FREE TOOL",
      url: "https://give.brand4e.bg/?src=creator_lab",
      is_new: true,
    },
  ],
};

function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Ignore storage quota errors
  }
}

export function appendSrcParam(url: string, src: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("src", src);
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}src=${encodeURIComponent(src)}`;
  }
}

export function useEcosystemFeed(enabled: boolean) {
  const [feed, setFeed] = useState<EcosystemFeed>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          timestamp?: number;
          data?: EcosystemFeed;
        };
        if (parsed?.data?.featured_promo && Array.isArray(parsed.data.projects)) {
          return parsed.data;
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_ECOSYSTEM_FEED;
  });

  // Session-only dismiss so the promo banner reappears on every app launch
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [seenProjectIds, setSeenProjectIds] = useState<string[]>(() =>
    readStringArray(SEEN_PROJECTS_KEY)
  );

  useEffect(() => {
    if (!enabled) return;

    let shouldFetch = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { timestamp?: number };
        if (
          typeof parsed.timestamp === "number" &&
          Date.now() - parsed.timestamp < TWELVE_HOURS_MS
        ) {
          shouldFetch = false;
        }
      }
    } catch {
      shouldFetch = true;
    }

    if (!shouldFetch) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(FEED_ENDPOINT, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as EcosystemFeed;
        if (data?.featured_promo?.id && Array.isArray(data.projects)) {
          setFeed(data);
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data })
            );
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {
        // Offline or unreachable — keep cached or hardcoded fallback silently
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled]);

  const dismissPromo = useCallback((promoId: string) => {
    setDismissedIds((prev) =>
      prev.includes(promoId) ? prev : [...prev, promoId]
    );
  }, []);

  const markProjectsSeen = useCallback(() => {
    const newIds = feed.projects.filter((p) => p.is_new).map((p) => p.id);
    if (newIds.length === 0) return;
    setSeenProjectIds((prev) => {
      const merged = Array.from(new Set([...prev, ...newIds]));
      writeStringArray(SEEN_PROJECTS_KEY, merged);
      return merged;
    });
  }, [feed.projects]);

  const isPromoDismissed = dismissedIds.includes(feed.featured_promo.id);
  const hasUnreadProjects =
    enabled &&
    feed.projects.some((p) => p.is_new && !seenProjectIds.includes(p.id));

  return {
    feed,
    isPromoDismissed,
    hasUnreadProjects,
    dismissPromo,
    markProjectsSeen,
  };
}
