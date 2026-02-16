import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // mobile overlay
  darkMode: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
}

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("darkMode");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  sidebarOpen: false,
  darkMode: typeof window !== "undefined" ? getInitialDarkMode() : false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (typeof window !== "undefined") localStorage.setItem("darkMode", String(next));
      return { darkMode: next };
    }),
}));
