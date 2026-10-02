"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type KanbanFullValue = {
  full: boolean;
  setFull: (value: boolean) => void;
  toggleFull: () => void;
};

const KanbanFullContext = createContext<KanbanFullValue | null>(null);

export function KanbanFullProvider({ children }: { children: ReactNode }) {
  const [full, setFullState] = useState(false);

  const setFull = useCallback((value: boolean) => {
    setFullState(value);
    if (value) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleFull = useCallback(() => setFull(!full), [full, setFull]);

  useEffect(() => {
    function onFs() {
      if (!document.fullscreenElement) setFullState(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFull(false);
    }
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, [setFull]);

  const value = useMemo(() => ({ full, setFull, toggleFull }), [full, setFull, toggleFull]);
  return <KanbanFullContext.Provider value={value}>{children}</KanbanFullContext.Provider>;
}

export function useKanbanFull() {
  const ctx = useContext(KanbanFullContext);
  if (!ctx) throw new Error("useKanbanFull must be used within KanbanFullProvider");
  return ctx;
}
