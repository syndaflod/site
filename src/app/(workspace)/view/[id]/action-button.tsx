"use client";

import { useTransition, type ReactNode } from "react";

type Props = { action: () => Promise<void>; children: ReactNode; className?: string };

/** Button that runs a Server Action and stays disabled while it runs, so a double click sends one request. */
export function ActionButton({ action, children, className = "cli-button" }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => startTransition(action)}
    >
      {children}
    </button>
  );
}
