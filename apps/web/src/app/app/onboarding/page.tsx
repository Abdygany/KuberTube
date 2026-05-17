"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";
import type { UserDefaults, WorkspaceFilters } from "@kubertube/core/filters";

type Step = 0 | 1 | 2 | 3 | 4;

const steps = ["Welcome", "Level", "Duration", "Balance", "Freshness"] as const;

interface Option<T> {
  value: T;
  title: string;
  description: string;
}

const levels: Option<UserDefaults["defaultLevel"]>[] = [
  {
    value: "beginner",
    title: "Beginner",
    description: "Объяснение с нуля, шаг за шагом.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    description: "Уже знаешь основы, идёшь вглубь.",
  },
  {
    value: "advanced",
    title: "Advanced",
    description: "Только продвинутые материалы.",
  },
];

const durations: Option<UserDefaults["defaultDuration"]>[] = [
  { value: "short", title: "Short", description: "До 30 минут на сессию." },
  { value: "medium", title: "Medium", description: "30-90 минут." },
  { value: "long", title: "Long", description: "Час и больше." },
];

const balances: Option<UserDefaults["defaultBalance"]>[] = [
  { value: "video", title: "Video-first", description: "В основном видео." },
  { value: "text", title: "Text-first", description: "В основном статьи." },
  { value: "mixed", title: "Mixed", description: "Поровну видео и текст." },
];

const freshness: Option<WorkspaceFilters["freshness"]>[] = [
  { value: "any", title: "Any time", description: "Без фильтра по дате." },
  {
    value: "2y",
    title: "Last 2 years",
    description: "Только относительно свежее.",
  },
  { value: "1y", title: "Last year", description: "Свежее года." },
  { value: "6m", title: "Last 6 months", description: "Только самое новое." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [defaults, setDefaults] = useState<UserDefaults>({
    defaultLevel: "beginner",
    defaultDuration: "medium",
    defaultBalance: "mixed",
    defaultFreshness: "any",
  });

  const complete = trpc.settings.completeOnboarding.useMutation({
    onSuccess: () => {
      router.replace("/app");
      router.refresh();
    },
  });

  const total = steps.length;

  function next() {
    if (step === total - 1) {
      complete.mutate(defaults);
    } else {
      setStep((step + 1) as Step);
    }
  }

  function back() {
    if (step > 0) setStep((step - 1) as Step);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center justify-between text-xs text-muted">
        <span>
          Step {step + 1} / {total}
        </span>
        <span>{steps[step]}</span>
      </div>

      <div className="rounded-lg border border-border bg-card p-8">
        {step === 0 ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold">Welcome to KuberTube</h1>
            <p className="text-sm leading-relaxed text-muted">
              Это учебный workspace для целенаправленного изучения тем. Никаких
              лент, автоплея и «похожих видео». Сейчас зададим дефолтные
              настройки твоего профиля — их всегда можно изменить в Settings или
              при создании workspace.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <CardChoices
            title="Какой у тебя обычный уровень?"
            options={levels}
            value={defaults.defaultLevel}
            onChange={(v) => setDefaults({ ...defaults, defaultLevel: v })}
          />
        ) : null}

        {step === 2 ? (
          <CardChoices
            title="Сколько обычно длится твоя сессия?"
            options={durations}
            value={defaults.defaultDuration}
            onChange={(v) => setDefaults({ ...defaults, defaultDuration: v })}
          />
        ) : null}

        {step === 3 ? (
          <CardChoices
            title="Что предпочитаешь — видео или текст?"
            options={balances}
            value={defaults.defaultBalance}
            onChange={(v) => setDefaults({ ...defaults, defaultBalance: v })}
          />
        ) : null}

        {step === 4 ? (
          <CardChoices
            title="Насколько свежим должен быть материал?"
            options={freshness}
            value={defaults.defaultFreshness}
            onChange={(v) => setDefaults({ ...defaults, defaultFreshness: v })}
          />
        ) : null}
      </div>

      {complete.error ? (
        <p className="mt-4 text-sm text-red-600">{complete.error.message}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 0 || complete.isPending}
        >
          Back
        </Button>
        <Button onClick={next} disabled={complete.isPending}>
          {step === total - 1
            ? complete.isPending
              ? "Saving..."
              : "Finish"
            : "Next"}
        </Button>
      </div>
    </div>
  );
}

function CardChoices<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`rounded-md border px-4 py-3 text-left transition ${
                active
                  ? "border-foreground bg-background"
                  : "border-border bg-card hover:border-muted"
              }`}
            >
              <div className="text-sm font-medium">{option.title}</div>
              <div className="text-xs text-muted">{option.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
