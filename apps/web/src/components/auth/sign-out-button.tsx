"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {pending ? "..." : "Sign out"}
    </button>
  );
}
