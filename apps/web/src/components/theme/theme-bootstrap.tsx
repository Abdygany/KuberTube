/**
 * Inline script that sets `html.dark` before React hydrates, so the
 * initial paint already matches the stored / system preference. Reads
 * `localStorage["kubertube:theme"]` (`light` | `dark` | `system`).
 * Persistence to `user_settings.uiTheme` lands in Phase 4 polish.
 */
export function ThemeBootstrap() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("kubertube:theme") || "system";
        var system = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var dark = stored === "dark" || (stored === "system" && system);
        document.documentElement.classList.toggle("dark", dark);
      } catch (_) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
