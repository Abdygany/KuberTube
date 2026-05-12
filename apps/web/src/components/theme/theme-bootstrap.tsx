import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Sets `html.dark` before React hydrates so the first paint matches
 * the stored / system preference. The inline script can't import the
 * shared module, so the storage key is interpolated to keep both
 * sides in sync.
 */
export function ThemeBootstrap() {
  const script = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )})||"system";var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
