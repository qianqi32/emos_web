"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "theme-mode";
const THEME_CHANGE_EVENT = "theme-mode-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(THEME_CHANGE_EVENT, cb);

  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(THEME_CHANGE_EVENT, cb);
  };
}

function getSnapshot(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

function applyTheme(mode: ThemeMode) {
  const hour = new Date().getHours();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = mode === "dark" || (mode === "system" && (hour >= 19 || hour < 7 || prefersDark));
  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cycleTheme = useCallback(() => {
    const nextMode: ThemeMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    localStorage.setItem(STORAGE_KEY, nextMode);
    applyTheme(nextMode);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, [mode]);

  const Icon = mode === "system" ? Monitor : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`当前主题：${mode}`}
      aria-label={`切换主题，当前为 ${mode}`}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60 text-muted-foreground backdrop-blur-sm transition-all hover:bg-background/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
