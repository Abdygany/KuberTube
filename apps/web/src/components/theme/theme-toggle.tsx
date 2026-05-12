"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "kubertube:theme";

function applyTheme(value: Theme) {
  if (typeof document === "undefined") return;
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = value === "dark" || (value === "system" && system);
  document.documentElement.classList.toggle("dark", dark);
}

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) ?? "system") as Theme;
    setTheme(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function update(value: Theme) {
    setTheme(value);
    localStorage.setItem(STORAGE_KEY, value);
    applyTheme(value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-border bg-card p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => update(value)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded transition",
            theme === value ? "bg-background text-foreground" : "text-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
