'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: authError } = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (authError) {
      setError(authError.message ?? 'Не удалось создать аккаунт.');
      return;
    }
    router.push('/app');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">Создать аккаунт</h1>
      <p className="mt-2 mb-8 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Email и пароль. Пароль ≥ 8 символов.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Имя
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Пароль
          </span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>
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
          {pending ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="mt-6 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Уже есть аккаунт?{' '}
        <Link href="/sign-in" className="underline">
          Войти
        </Link>
      </p>
    </main>
  );
}
