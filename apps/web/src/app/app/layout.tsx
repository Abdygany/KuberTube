import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TRPCClientError } from "@trpc/client";
import { getUserBootstrap } from "@/lib/trpc/server";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let me: { id: string; email: string; name: string | null };
  try {
    ({ me } = await getUserBootstrap());
  } catch (err) {
    if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
      redirect("/sign-in");
    }
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/app" className="text-sm font-semibold">
            KuberTube
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/app" className="hover:text-foreground">
              Workspaces
            </Link>
            <Link href="/app/settings" className="hover:text-foreground">
              Settings
            </Link>
            <span className="hidden text-xs md:inline">{me.email}</span>
            <ThemeToggle />
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
