"use client";

import { type ReactNode } from "react";
import { StoreProvider } from "@/lib/store/store";
import { KanbanFullProvider } from "@/components/board/kanban-full";
import { AppShell } from "@/components/shell";
import { ThemeProvider } from "@/components/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <KanbanFullProvider>
          <AppShell>{children}</AppShell>
        </KanbanFullProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
