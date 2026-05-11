'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: authError } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (authError) {
      setError(authError.message ?? 'Не удалось войти.');
      return;
    }
    router.push('/app');
  }

  return (
    <AuthShell title="Войти" subtitle="Введите email и пароль.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </Field>
        <Field label="Пароль">
          <input
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </Field>
        {error && (
          <p className="text-sm" role="alert" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md py-2 text-sm text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="mt-6 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Нет аккаунта?{' '}
        <Link href="/sign-up" className="underline">
          Создать
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-2 mb-8 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        {subtitle}
      </p>
      {children}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
