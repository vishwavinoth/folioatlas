import { Globe } from "lucide-react";

type Props = {
  url: string;
  /** Accessible label for the site (usually the developer name). */
  label: string;
  className?: string;
};

/**
 * Portfolio website tile. Deliberately self-contained: no screenshot or
 * third-party image service is contacted. The in-page preview dialog embeds
 * the site itself when the visitor asks for it.
 */
export function SiteTile({ url, label, className = "" }: Props) {
  let host = url;
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.host.replace(/^www\./, "");
    path = parsed.pathname === "/" ? "" : parsed.pathname;
  } catch {
    /* validated upstream */
  }

  return (
    <div
      className={`relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-[var(--surface-border)] bg-gradient-to-br from-[var(--fa-accent)]/[0.06] to-black/[0.03] px-4 text-center dark:to-white/[0.04] ${className}`}
      role="img"
      aria-label={`Website of ${label}: ${host}`}
    >
      <Globe className="h-6 w-6 text-[var(--fa-accent)]" aria-hidden="true" />
      <span className="max-w-full truncate text-sm font-semibold tracking-tight">{host}</span>
      {path && <span className="max-w-full truncate text-[11px] text-[var(--fa-text-secondary)]">{path}</span>}
    </div>
  );
}
