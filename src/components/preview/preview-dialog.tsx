"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldAlert, RefreshCw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Portfolio website URL (validated at sync time). */
  url: string;
  label: string;
};

/**
 * In-page website preview dialog (PRD §4).
 *
 * Honest behavior: many portfolio sites send X-Frame-Options/CSP headers that
 * legitimately prevent embedding. We attempt the iframe, keep the attempt
 * visibly bounded (timeout notice), and ALWAYS surface an explicit
 * "Open in new tab" action. We never bypass security restrictions.
 */
export function PreviewDialog({ open, onOpenChange, url, label }: Props) {
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Render-time adjustment (React-recommended): reset the timeout flag when
  // the dialog closes, instead of calling setState inside an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setTimedOut(false);
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [open, reloadKey]);

  let host = url;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    /* validated upstream */
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 sm:p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>In-page preview of {label}</DialogTitle>
          <DialogDescription>
            Embedded preview of {host}. If the site prevents embedding, use the open-in-new-tab action.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full bg-black/[0.03] sm:aspect-video dark:bg-white/[0.04]">
          <iframe
            key={reloadKey}
            ref={frameRef}
            src={url}
            title={`Embedded preview of ${label}`}
            className="h-full w-full border-0 bg-white"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="eager"
          />

          {timedOut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center backdrop-blur-sm">
              <ShieldAlert className="h-8 w-8 text-[var(--fa-text-secondary)]" aria-hidden="true" />
              <p className="max-w-sm text-sm leading-relaxed text-[var(--fa-text-secondary)]">
                <span className="font-medium text-foreground">{host}</span> may prevent embedding via its
                security headers — that is the site working as intended. Open it in a new tab instead.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    Open in new tab
                  </a>
                </Button>
                <Button variant="outline" onClick={() => { setTimedOut(false); setReloadKey((k) => k + 1); }}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Retry preview
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--surface-border)] px-4 py-2.5">
          <span className="min-w-0 truncate text-xs text-[var(--fa-text-secondary)]">{host}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--fa-accent)] hover:underline"
          >
            Open in new tab
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
