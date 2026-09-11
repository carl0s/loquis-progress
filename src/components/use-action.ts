"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/types";

/** Runs a server action inside a transition and keeps its error message. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result.ok) onDone?.();
        else setError(result.error);
      } catch {
        setError("Salvataggio non riuscito. Riprova.");
      }
    });

  return { pending, error, run, setError };
}
