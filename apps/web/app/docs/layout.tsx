import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const nav = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/get-api-keys', label: 'Get API keys' },
  { href: '/docs/self-host', label: 'Self-host' },
  { href: '/docs/faq', label: 'FAQ' },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-accent" />
            Learnspace
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">Docs</span>
        </div>
      </header>
      <div className="container grid max-w-5xl gap-8 py-10 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main className="prose prose-zinc dark:prose-invert max-w-none">{children}</main>
      </div>
    </div>
  );
}
