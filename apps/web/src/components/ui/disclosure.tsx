import type { ReactNode } from "react";

interface Props {
  question: string;
  children: ReactNode;
}

/**
 * Native <details>/<summary> disclosure card. SSR-safe, keyboard-
 * accessible without JS, used for FAQ on the landing page and the
 * /docs FAQ.
 */
export function Disclosure({ question, children }: Props) {
  return (
    <details className="rounded-md border border-border bg-card p-4 [&_summary]:cursor-pointer">
      <summary className="text-sm font-medium">{question}</summary>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
