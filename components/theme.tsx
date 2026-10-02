"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, THEME_KEY, type Theme } from "@/lib/theme";
import { cn } from "./ui";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return readTheme();
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "light" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode */
    }
    applyTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      suppressHydrationWarning
        className={cn(
          "motion-press grid h-10 w-10 place-items-center rounded-md border border-line text-mute hover:bg-elevated hover:text-ink md:h-8 md:w-8",
          className,
        )}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
      title={isLight ? "Modo escuro" : "Modo claro"}
      onClick={toggle}
    >
      {isLight ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
