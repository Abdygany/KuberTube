import {
  BookOpen,
  Check,
  Key,
  Search,
  Shield,
  StickyNote,
  Target,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Target,
    title: 'Goal-first workspaces',
    description:
      'Every session starts with a declared intention. The product works with your goal, not against it.',
  },
  {
    icon: Search,
    title: 'Parallel search',
    description:
      'YouTube and Brave Search queried simultaneously. Results filtered by level, duration, and freshness.',
  },
  {
    icon: Video,
    title: 'Distraction-free viewer',
    description:
      'Videos play without recommended content, autoplay, or related feeds. When a video ends — it stops.',
  },
  {
    icon: BookOpen,
    title: 'Reader mode for articles',
    description:
      'Web articles rendered with clean typography for long reading. No cookie banners, no ads, no sidebars.',
  },
  {
    icon: StickyNote,
    title: 'Notes with timecodes',
    description:
      'Markdown notes attached to every resource. Insert the current video timestamp with one click.',
  },
  {
    icon: Key,
    title: 'Bring your own keys',
    description:
      'Your YouTube and Brave API keys are encrypted with AES-256-GCM. Learnspace never sees plaintext keys.',
  },
  {
    icon: Shield,
    title: 'No algorithms, ever',
    description:
      'No recommendations. No infinite scroll. No gamification. Only what you intentionally put in.',
  },
];

const principles = [
  'No recommendations of any kind',
  'No autoplay when a video ends',
  'No infinite scroll — lists have ends',
  'No attention-grabbing badges or streaks',
  'No automatic push notifications',
  'No gamification mechanics',
  'Quick escape — no "Are you sure?" every time',
  'No dark patterns',
  'Closed system — only what you added',
];

const faqs = [
  {
    q: 'Do I need to pay for API keys?',
    a: 'YouTube Data API v3 is free — 10,000 units per day is plenty for personal use. Brave Search API costs $3 per 1,000 requests with 2,000 free per month. Most users stay within free tiers.',
  },
  {
    q: 'Are my API keys safe?',
    a: 'Yes. Keys are encrypted with AES-256-GCM before being stored. The master encryption key never leaves your server instance. Keys are decrypted only in memory when making API requests and are never logged.',
  },
  {
    q: "Why can't I self-host easily?",
    a: 'You can. A Docker Compose file and full self-host documentation are included. You just need a Postgres database and two environment variables.',
  },
  {
    q: 'Will there be ads or a paid tier?',
    a: 'No ads. The model is open-source with BYO keys — you pay for your own API usage directly, not Learnspace.',
  },
  {
    q: 'What about mobile?',
    a: 'The web app is responsive and works well on mobile browsers. A dedicated mobile app is planned post-MVP.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <BookOpen className="h-4 w-4 text-accent" />
            Learnspace
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5"
            >
              Docs
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center gap-8 py-24 text-center md:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
          Open source · BYO API keys · No subscription
        </div>
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Study without the{' '}
            <span className="text-accent">algorithm</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
            A learning workspace for students who want to go deep on a topic — without YouTube rabbit
            holes, recommendation feeds, or autoplay distractions.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild className="gap-2">
            <Link href="/sign-up">
              Start learning for free
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Free to use · Your API keys · Your data
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-secondary/20 py-20">
        <div className="container max-w-3xl space-y-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Declare your goal',
                body: 'Create a workspace with a specific learning goal — "Understand attention mechanisms in transformers" or "Get a working knowledge of Bayesian inference". The product uses this as a lens, not a keyword.',
              },
              {
                step: '02',
                title: 'Search YouTube and the web simultaneously',
                body: "Learnspace queries YouTube and Brave Search in parallel, applying your filters (level, duration, content type, freshness). You see the results — you choose what's relevant. No ranking algorithm decides for you.",
              },
              {
                step: '03',
                title: 'Study without distraction',
                body: 'Videos play without related videos, autoplay, or suggested content. Articles open in a clean reader view. Everything stays inside your workspace — the closed system is the point.',
              },
              {
                step: '04',
                title: 'Take notes, track progress',
                body: 'Markdown notes attached to each resource. Insert video timecodes in one click. Progress tracked per resource and per workspace. Come back later and pick up exactly where you left off.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="w-10 shrink-0 text-right font-mono text-lg font-semibold text-accent/60">
                  {item.step}
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container max-w-4xl space-y-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Built to protect your attention
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="space-y-2 rounded-lg border border-border p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <f.icon className="h-4 w-4 text-accent" />
                </div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UX Principles */}
      <section className="border-t border-border bg-secondary/20 py-20">
        <div className="container max-w-2xl space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Nine UX principles</h2>
            <p className="text-muted-foreground">
              These are laws, not guidelines. Every product decision is measured against them.
            </p>
          </div>
          <ul className="space-y-2">
            {principles.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-2xl space-y-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="space-y-2 border-b border-border pb-6 last:border-0">
                <h3 className="font-medium">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20">
        <div className="container flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to study differently?</h2>
          <p className="max-w-md text-muted-foreground">
            Create a free account. Add your API keys. Start your first workspace.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">Get started — it's free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Learnspace — open source, MIT licence</span>
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <Link href="/docs/get-api-keys" className="hover:text-foreground">API keys</Link>
            <Link href="/docs/self-host" className="hover:text-foreground">Self-host</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
