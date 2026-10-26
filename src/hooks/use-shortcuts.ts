"use client";

import { useEffect } from "react";

/**
 * FolioAtlas — global keyboard shortcut system (PRD §9).
 *
 * Conventions honored:
 *  - "/" and "?" NEVER fire while the user is typing in an input, textarea,
 *    contenteditable element or open Radix dialog.
 *  - Esc closes the topmost layer: Radix handles its own dialogs/palettes;
 *    this hook covers non-modal surfaces (mobile menu, preview drawer).
 *  - Single global listener, cleaned up on unmount; no duplicate handlers.
 */

export type ShortcutAction =
  | "focus-search"
  | "open-palette"
  | "open-help";

export type ShortcutHandlers = {
  onFocusSearch?: () => void;
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
};

/** True when the event target is an editable element — shortcuts must not fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when a modal dialog layer is open (Radix adds data-state to body). */
function isModalOpen(): boolean {
  return (
    document.querySelector("[data-state='open'][role='dialog']") !== null ||
    document.querySelector("[data-state='open'][role='alertdialog']") !== null
  );
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K toggles the command palette — works even from inputs
      // (standard convention in dev tools and directories alike).
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.onOpenPalette?.();
        return;
      }

      // While a modal is open, Radix manages Esc/focus — stay out of the way.
      if (isModalOpen()) return;

      if (e.key === "Escape") {
        // Non-modal escape hatch: blur the focused element (e.g. search input).
        const active = document.activeElement;
        if (active instanceof HTMLElement && isEditableTarget(active)) active.blur();
        return;
      }

      if (isEditableTarget(e.target)) return;
      if (mod || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusSearch?.();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        handlers.onOpenHelp?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}

export const SHORTCUT_DOCS: Array<{ keys: string; action: string }> = [
  { keys: "/", action: "Focus the search field" },
  { keys: "Ctrl / ⌘ + K", action: "Open the command palette" },
  { keys: "Esc", action: "Close the topmost dialog, palette or preview" },
  { keys: "Enter", action: "Activate the selected result or command" },
  { keys: "↑ ↓", action: "Navigate palette results" },
  { keys: "Ctrl / ⌘ + Enter", action: "Open the selected result in a new tab" },
  { keys: "?", action: "Open this shortcuts help panel" },
];
