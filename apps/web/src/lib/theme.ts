export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "kubertube:theme";

/** Resolves `system` against `prefers-color-scheme` and toggles `html.dark`. */
export function applyTheme(value: Theme): void {
  if (typeof document === "undefined") return;
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = value === "dark" || (value === "system" && system);
  document.documentElement.classList.toggle("dark", dark);
}
