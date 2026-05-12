import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createServerTrpc } from "@/lib/trpc/server";

export default async function AuthedLayout({ children }: { children: ReactNode }) {
  const trpc = await createServerTrpc();
  const settings = await trpc.settings.get.query();
  if (!settings.onboardingCompleted) {
    redirect("/app/onboarding");
  }
  return <>{children}</>;
}
