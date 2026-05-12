import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/api-keys", label: "Getting API keys" },
  { href: "/docs/self-host", label: "Self-host" },
  { href: "/docs/faq", label: "FAQ" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold">
            KuberTube
          </Link>
          <nav className="text-sm">
            <Link href="/sign-in" className="text-muted hover:text-foreground">
              Sign in →
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-10 px-6 py-10 md:flex-row flex-col">
        <aside className="md:w-56 md:shrink-0">
          <ul className="space-y-1 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-muted transition hover:bg-card hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <main className="prose-docs min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
