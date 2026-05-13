"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AppSettings {
  defaultLevel: string;
  defaultDuration: string;
  defaultBalance: string;
  defaultFreshness: string;
  uiTheme: string;
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
 */
export function useAppUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useAppUser called outside <UserProvider>");
  }
  return ctx;
}
