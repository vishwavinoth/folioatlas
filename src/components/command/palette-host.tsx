"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette, ShortcutsHelp } from "@/components/command/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-shortcuts";

type PaletteState = { paletteOpen: boolean; helpOpen: boolean };

const listeners = new Set<(s: PaletteState) => void>();
let state: PaletteState = { paletteOpen: false, helpOpen: false };

function applyState(patch: Partial<PaletteState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

/** Imperative controls shared by the nav bar, shortcuts hook and views. */
export const paletteControls = {
  open: () => applyState({ paletteOpen: true }),
  close: () => applyState({ paletteOpen: false }),
  toggle: () => applyState({ paletteOpen: !state.paletteOpen }),
  openHelp: () => applyState({ helpOpen: true, paletteOpen: false }),
  closeHelp: () => applyState({ helpOpen: false }),
  isOpen: () => state.paletteOpen,
};

function usePaletteState(): PaletteState {
  const [s, setS] = useState<PaletteState>(state);
  useEffect(() => {
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

/** Mount once in the app shell: owns both dialogs and the shortcut wiring. */
export function CommandPaletteHost() {
  const { paletteOpen, helpOpen } = usePaletteState();

  const focusSearch = useCallback(() => {
    // Focus the visible search field when present, otherwise open the palette.
    const el =
      document.getElementById("directory-search") ??
      document.getElementById("home-search") ??
      document.getElementById("ai-search");
    if (el instanceof HTMLElement) {
      el.focus();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      paletteControls.open();
    }
  }, []);

  const handlers = useMemo(
    () => ({
      onFocusSearch: focusSearch,
      onOpenPalette: () => paletteControls.toggle(),
      onOpenHelp: () => paletteControls.openHelp(),
    }),
    [focusSearch]
  );

  useKeyboardShortcuts(handlers);

  return (
    <>
      <CommandPalette open={paletteOpen} onOpenChange={(o) => (o ? paletteControls.open() : paletteControls.close())} />
      <ShortcutsHelp open={helpOpen} onOpenChange={(o) => (o ? paletteControls.openHelp() : paletteControls.closeHelp())} />
    </>
  );
}
