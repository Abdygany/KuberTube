'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

type Level = 'beginner' | 'intermediate' | 'advanced';
type Duration = 'short' | 'medium' | 'long';
type Balance = 'video' | 'text' | 'mixed';
type Freshness = 'any' | '6m' | '1y' | '2y';

type Choices = {
  defaultLevel: Level;
  defaultDuration: Duration;
  defaultBalance: Balance;
  defaultFreshness: Freshness;
};

const DEFAULTS: Choices = {
  defaultLevel: 'intermediate',
  defaultDuration: 'medium',
  defaultBalance: 'mixed',
  defaultFreshness: 'any',
};

export default function OnboardingPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const update = trpc.settings.update.useMutation();
  const complete = trpc.settings.completeOnboarding.useMutation();

  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Choices>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);

  if (!session.isPending && !session.data?.user) {
    router.replace('/sign-in');
    return null;
  }

  async function finish(values: Choices) {
    setSubmitting(true);
    await update.mutateAsync(values);
    await complete.mutateAsync();
    setSubmitting(false);
    router.replace('/app');
  }

  async function skip() {
    setSubmitting(true);
    await complete.mutateAsync();
    setSubmitting(false);
    router.replace('/app');
  }

  const steps = [
    <Intro key="intro" onNext={() => setStep(1)} onSkip={skip} disabled={submitting} />,
    <Question
      key="level"
      title="Какой у вас уровень?"
      hint="Можно изменить для каждого workspace отдельно."
      options={[
        { value: 'beginner', label: 'Новичок' },
        { value: 'intermediate', label: 'Средний' },
        { value: 'advanced', label: 'Продвинутый' },
      ]}
      value={choices.defaultLevel}
      onSelect={(v) => setChoices((c) => ({ ...c, defaultLevel: v as Level }))}
      onBack={() => setStep(0)}
      onNext={() => setStep(2)}
      onSkip={skip}
      disabled={submitting}
    />,
    <Question
      key="duration"
      title="Сколько длится типичная сессия?"
      hint="Влияет на длину предлагаемых материалов."
      options={[
        { value: 'short', label: 'Короткая (до 30 минут)' },
        { value: 'medium', label: 'Средняя (30 минут – 1.5 часа)' },
        { value: 'long', label: 'Длинная (1.5+ часа)' },
      ]}
      value={choices.defaultDuration}
      onSelect={(v) => setChoices((c) => ({ ...c, defaultDuration: v as Duration }))}
      onBack={() => setStep(1)}
      onNext={() => setStep(3)}
      onSkip={skip}
      disabled={submitting}
    />,
    <Question
      key="balance"
      title="Видео или текст?"
      hint="Какой формат хотите видеть в подборке чаще."
      options={[
        { value: 'video', label: 'Скорее видео' },
        { value: 'text', label: 'Скорее текст' },
        { value: 'mixed', label: 'Поровну' },
      ]}
      value={choices.defaultBalance}
      onSelect={(v) => setChoices((c) => ({ ...c, defaultBalance: v as Balance }))}
      onBack={() => setStep(2)}
      onNext={() => setStep(4)}
      onSkip={skip}
      disabled={submitting}
    />,
    <Question
      key="freshness"
      title="Насколько свежими должны быть материалы?"
      hint="Старые материалы могут быть глубже, но менее актуальны."
      options={[
        { value: 'any', label: 'Без ограничений' },
        { value: '2y', label: 'За последние 2 года' },
        { value: '1y', label: 'За последний год' },
        { value: '6m', label: 'За последние 6 месяцев' },
      ]}
      value={choices.defaultFreshness}
      onSelect={(v) => setChoices((c) => ({ ...c, defaultFreshness: v as Freshness }))}
      onBack={() => setStep(3)}
      onNext={() => finish(choices)}
      nextLabel="Готово"
      onSkip={skip}
      disabled={submitting}
    />,
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <Progress current={step} total={steps.length} />
      <div className="mt-10">{steps[step]}</div>
    </main>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-colors"
          style={{
            background: i <= current ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}

function Intro({
  onNext,
  onSkip,
  disabled,
}: {
  onNext: () => void;
  onSkip: () => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h1 className="font-serif text-3xl">Что такое Learnspace</h1>
      <p className="mt-4" style={{ color: 'var(--color-fg-muted)' }}>
        Учебный workspace для фокус-сессий по конкретной теме. Без рекомендаций, автоплея и
        бесконечных лент. Вы задаёте цель — приложение помогает собрать материалы. Алгоритм
        фильтрует, не ранжирует.
      </p>
      <p className="mt-4" style={{ color: 'var(--color-fg-muted)' }}>
        Сейчас 4 коротких вопроса о ваших предпочтениях. Это дефолты — их можно менять для каждого
        workspace.
      </p>
      <Footer onPrimary={onNext} primaryLabel="Начать" onSkip={onSkip} disabled={disabled} />
    </div>
  );
}

function Question<T extends string>({
  title,
  hint,
  options,
  value,
  onSelect,
  onBack,
  onNext,
  nextLabel = 'Далее',
  onSkip,
  disabled,
}: {
  title: string;
  hint: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  onSkip: () => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-2" style={{ color: 'var(--color-fg-muted)' }}>
        {hint}
      </p>
      <div className="mt-6 space-y-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-4 py-3 text-left transition-colors"
            style={{
              borderColor: value === o.value ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Footer
        onPrimary={onNext}
        primaryLabel={nextLabel}
        onBack={onBack}
        onSkip={onSkip}
        disabled={disabled}
      />
    </div>
  );
}

function Footer({
  onPrimary,
  primaryLabel,
  onBack,
  onSkip,
  disabled,
}: {
  onPrimary: () => void;
  primaryLabel: string;
  onBack?: () => void;
  onSkip: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className="text-sm disabled:opacity-50"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Пропустить
      </button>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Назад
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={disabled}
          className="rounded-md px-5 py-2 text-sm text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
