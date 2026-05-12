import { ThemeToggle } from "@/components/theme/theme-toggle";

export function ThemeSection() {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-medium">Theme</h2>
        <p className="text-xs text-muted">
          Светлая, тёмная или по системе. Сейчас хранится только в браузере;
          синхронизация в профиле появится позже.
        </p>
      </header>
      <ThemeToggle />
    </section>
  );
}
