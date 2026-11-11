"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFeatures } from "@/lib/features/context";
import { compactCount, toggleLike, useEngagement, useLiked } from "@/lib/engagement/client";
import { toast } from "@/lib/notify";

type Props = {
  slug: string;
  name: string;
  /** pill: compact card control · button: labelled detail-page action · icon: heart only. */
  variant?: "pill" | "button" | "icon";
  className?: string;
};

/**
 * Like toggle with an all-time count. Optimistic, deduplicated server-side
 * (one like per anonymous visitor) and hidden when engagement is disabled.
 */
export function LikeButton({ slug, name, variant = "pill", className = "" }: Props) {
  const { engagement } = useFeatures();
  const counts = useEngagement(slug, engagement);
  const liked = useLiked(slug);
  const [busy, setBusy] = useState(false);
  if (!engagement) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const outcome = await toggleLike(slug);
    setBusy(false);
    if (outcome === "daily-limit") {
      toast.error("Like limit reached for today", { description: "Thanks for the enthusiasm — try again tomorrow." });
    } else if (outcome === "failed") {
      toast.error("Couldn't save your like", { description: "Please check your connection and try again." });
    }
  };

  const count = counts ? compactCount(counts.likes) : null;
  const heart = (
    <Heart
      className={`${variant === "button" ? "h-4 w-4" : "h-3.5 w-3.5"} shrink-0 transition-transform ${liked ? "scale-110 fill-current" : ""}`}
      aria-hidden="true"
    />
  );
  const tone = liked
    ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : "border-[var(--surface-border)] text-[var(--fa-text-secondary)] hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400";
  const label = `${liked ? "Unlike" : "Like"} ${name}'s portfolio${counts ? ` (${counts.likes} like${counts.likes === 1 ? "" : "s"})` : ""}`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={liked}
        aria-label={label}
        disabled={busy}
        className={`inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors disabled:opacity-70 ${tone} ${className}`}
      >
        {heart}
        {liked ? "Liked" : "Like"}
        {count !== null && <span className="tabular-nums opacity-80">{count}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={label}
      title={liked ? "Unlike" : "Like this portfolio"}
      disabled={busy}
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border text-xs font-medium tabular-nums transition-colors disabled:opacity-70 ${
        variant === "icon" ? "w-8" : "min-w-8 px-2.5"
      } ${tone} ${className}`}
    >
      {heart}
      {variant === "pill" && count !== null && <span>{count}</span>}
    </button>
  );
}
