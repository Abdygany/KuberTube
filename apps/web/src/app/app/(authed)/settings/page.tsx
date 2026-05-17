import { ProfileSection } from "./_components/profile-section";
import { DefaultsSection } from "./_components/defaults-section";
import { KeysSection } from "./_components/keys-section";
import { ThemeSection } from "./_components/theme-section";
import { DangerZone } from "./_components/danger-zone";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-12 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Профиль, дефолты для подбора материалов, API-ключи и тема.
        </p>
      </header>
      <ProfileSection />
      <DefaultsSection />
      <KeysSection />
      <ThemeSection />
      <DangerZone />
    </div>
  );
}
