import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="max-w-2xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Learnspace</h1>
        <p className="text-lg text-muted-foreground">
          A learning workspace for focused study sessions. No recommendations, no feeds, no
          algorithms. Just you and the topic you came to understand.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
