"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Structural type of `userSettings` row that we expose to the client.
 * Kept structural (not `Awaited<ReturnType<...>>`) so this module
 * stays browser-safe — importing from `@/lib/trpc/server` would drag
 * server-only Drizzle deps in. The enum members mirror the pgEnum
 * literals in `packages/db/src/schema/user-settings.ts`.
 */
export interface AppSettings {
  defaultLevel: "beginner" | "intermediate" | "advanced";
  defaultDuration: "short" | "medium" | "long";
  defaultBalance: "video" | "text" | "mixed";
  defaultFreshness: "any" | "6m" | "1y" | "2y";
  uiTheme: "light" | "dark" | "system";
  uiLanguage: string;
  onboardingCompleted: boolean;
}

interface UserContextValue {
  me: AppUser;
  settings: AppSettings;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  value,
  children,
}: {
  value: UserContextValue;
  children: ReactNode;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Returns the bootstrapped user + settings threaded down from the
 * `/app` layout. Throws if used outside that provider — components
 * that need bootstrap data must be rendered inside the authed shell.
 * For shared UI that may render on public pages, use
 * `useOptionalAppUser` instead.
 */
export function useAppUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useAppUser called outside <UserProvider>");
  }
  return ctx;
}

/** Same as `useAppUser` but returns `null` outside the provider. */
export function useOptionalAppUser(): UserContextValue | null {
  return useContext(UserContext);
}
