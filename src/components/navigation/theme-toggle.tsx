"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeChoice = "light" | "dark" | "system";

const CHOICES: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Hydration probe without setState-in-effect: false on the server snapshot,
  // true on the client after hydration (keeps layout stable, PRD §12.1).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full" aria-hidden="true" />;
  }

  const current = (theme ?? "system") as ThemeChoice;

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-full border border-transparent bg-black/[0.04] p-0.5 dark:bg-white/[0.06]"
    >
      {CHOICES.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              active
                ? "bg-white text-foreground shadow-sm dark:bg-white/15"
                : "text-[var(--fa-text-secondary)] hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
