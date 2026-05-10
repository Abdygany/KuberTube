'use client';

import { ArrowLeft, ArrowRight, BookOpen, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type Level = 'beginner' | 'intermediate' | 'advanced';
type Duration = 'short' | 'medium' | 'long';
type Balance = 'video' | 'text' | 'mixed';
type Freshness = 'any' | '6m' | '1y' | '2y';

interface OnboardingState {
  level: Level;
  duration: Duration;
  balance: Balance;
  freshness: Freshness;
}

const STEPS = ['Welcome', 'Level', 'Duration', 'Balance', 'Done'] as const;

function OptionCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-all',
        selected
          ? 'border-accent bg-accent/5 ring-1 ring-accent'
          : 'border-border hover:border-accent/40 hover:bg-secondary/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    level: 'intermediate',
    duration: 'medium',
    balance: 'mixed',
    freshness: 'any',
  });

  const complete = trpc.user.completeOnboarding.useMutation({
    onSuccess: () => router.replace('/workspaces'),
  });

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function finish() {
    complete.mutate(state);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{STEPS[step]}</span>
            <span>{step + 1} / {STEPS.length}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {step === 0 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <BookOpen className="h-8 w-8 text-accent" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Welcome to Learnspace</h1>
              <p className="text-muted-foreground">
                A workspace that protects your attention. No recommendations, no autoplay, no feeds
                — only what you intentionally choose to study.
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4 text-left text-sm">
              <p className="font-medium">How it works</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>→ Create a workspace with a learning goal</li>
                <li>→ Search YouTube and the web for relevant resources</li>
                <li>→ Study distraction-free, take notes, track progress</li>
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">What's your typical level?</h2>
              <p className="text-sm text-muted-foreground">
                This helps filter content complexity. You can change it per workspace.
              </p>
            </div>
            <div className="space-y-2">
              <OptionCard
                selected={state.level === 'beginner'}
                onClick={() => setState((s) => ({ ...s, level: 'beginner' }))}
                title="Beginner"
                description="New to the topic, prefer introductory explanations"
              />
              <OptionCard
                selected={state.level === 'intermediate'}
                onClick={() => setState((s) => ({ ...s, level: 'intermediate' }))}
                title="Intermediate"
                description="Some background, ready for deeper dives"
              />
              <OptionCard
                selected={state.level === 'advanced'}
                onClick={() => setState((s) => ({ ...s, level: 'advanced' }))}
                title="Advanced"
                description="Strong foundation, looking for nuanced content"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Typical session length?</h2>
              <p className="text-sm text-muted-foreground">
                Helps prioritise video length. You can adjust per workspace.
              </p>
            </div>
            <div className="space-y-2">
              <OptionCard
                selected={state.duration === 'short'}
                onClick={() => setState((s) => ({ ...s, duration: 'short' }))}
                title="Short"
                description="Under 20 minutes — quick targeted sessions"
              />
              <OptionCard
                selected={state.duration === 'medium'}
                onClick={() => setState((s) => ({ ...s, duration: 'medium' }))}
                title="Medium"
                description="20–60 minutes — standard study session"
              />
              <OptionCard
                selected={state.duration === 'long'}
                onClick={() => setState((s) => ({ ...s, duration: 'long' }))}
                title="Long"
                description="Over an hour — deep-dive sessions"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Prefer videos or articles?</h2>
              <p className="text-sm text-muted-foreground">Sets the default balance in search results.</p>
            </div>
            <div className="space-y-2">
              <OptionCard
                selected={state.balance === 'video'}
                onClick={() => setState((s) => ({ ...s, balance: 'video' }))}
                title="Videos"
                description="Mostly YouTube videos in search results"
              />
              <OptionCard
                selected={state.balance === 'mixed'}
                onClick={() => setState((s) => ({ ...s, balance: 'mixed' }))}
                title="Mixed"
                description="Balanced mix of videos and articles"
              />
              <OptionCard
                selected={state.balance === 'text'}
                onClick={() => setState((s) => ({ ...s, balance: 'text' }))}
                title="Articles"
                description="Mostly web articles in search results"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">You're all set</h2>
              <p className="text-muted-foreground">
                Your preferences are saved. Create your first workspace to start learning.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => complete.mutate(state)}
            className="text-muted-foreground"
            disabled={complete.isPending}
          >
            Skip
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={next} className="gap-1.5">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={complete.isPending} className="gap-1.5">
              {complete.isPending ? 'Saving…' : 'Start learning'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
