"use client";

import { type ReactNode } from "react";
import { StoreProvider } from "@/lib/store/store";
import { AppShell } from "@/components/shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
