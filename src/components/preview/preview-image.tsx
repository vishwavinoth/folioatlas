"use client";

import { useState } from "react";
import { Globe, ImageOff } from "lucide-react";

type Props = {
  slug: string;
  url: string;
  /** Accessible label for the site (usually the developer name). */
  label: string;
  className?: string;
  /** Render an action row (e.g. quick actions) over the image on hover. */
  children?: React.ReactNode;
};

/**
 * Portfolio website preview image.
 *  - Source is always our own /api/preview/[slug] route (server resolves the
 *    provider; credentials stay server-side).
 *  - Loading state: shimmer skeleton.
 *  - Failure state: explicit "preview unavailable" surface — never a
 *    fabricated screenshot — with the site domain displayed.
 */
export function PreviewImage({ slug, url, label, className = "", children }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  let host = url;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    /* validated upstream */
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--surface-border)] bg-black/[0.02] dark:bg-white/[0.03] ${className}`}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/[0.04] to-black/[0.08] dark:from-white/[0.04] dark:to-white/[0.08]" aria-hidden="true" />
      )}

      {failed ? (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 text-center" aria-label={`Preview unavailable for ${label}`}>
          <ImageOff className="h-5 w-5 text-[var(--fa-text-secondary)]" aria-hidden="true" />
          <span className="px-3 text-[11px] leading-tight text-[var(--fa-text-secondary)]">
            Preview unavailable
          </span>
          <span className="max-w-full truncate px-3 text-[11px] font-medium">{host}</span>
        </div>
      ) : (
        <img
          src={`/api/preview/${slug}`}
          alt={`Website preview of ${label} — ${host}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`aspect-[16/10] w-full object-cover object-top transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {!failed && loaded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/45 to-transparent px-2.5 pb-1.5 pt-6 text-[10px] font-medium text-white/90">
          <Globe className="h-3 w-3" aria-hidden="true" />
          <span className="truncate">{host}</span>
        </div>
      )}

      {children}
    </div>
  );
}
