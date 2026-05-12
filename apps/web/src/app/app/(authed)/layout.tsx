import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserBootstrap } from "@/lib/trpc/server";

export default async function AuthedLayout({ children }: { children: ReactNode }) {
  const { settings } = await getUserBootstrap();
  if (!settings.onboardingCompleted) {
    redirect("/app/onboarding");
  }
  return <>{children}</>;
}
