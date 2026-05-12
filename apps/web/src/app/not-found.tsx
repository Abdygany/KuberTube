import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="h-10 w-10 text-muted" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted">
          Этой страницы нет. Возможно, workspace или ресурс были удалены.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/app">Back to workspaces</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">Landing</Link>
        </Button>
      </div>
    </main>
  );
}
