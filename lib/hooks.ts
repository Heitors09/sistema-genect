"use client";

import { useEffect, useState } from "react";

export function useIsDesktop(query = "(min-width: 768px)") {
  const [desktop, setDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return desktop;
}
