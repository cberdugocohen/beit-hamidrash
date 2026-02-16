"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/ui";

export default function DarkModeSync() {
  const darkMode = useUIStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  return null;
}
