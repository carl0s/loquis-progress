"use client";

import { useId, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { createDeliverable, saveKeywords } from "@/app/actions";
import { Button, ErrorText, Field, inputClass, labelClass } from "./ui";
import { useAction } from "./use-action";

export function KeywordsForm({ projectId, keywords }: { projectId: string; keywords: string[] }) {
  const id = useId();
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAction();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("keywords") ?? "");
        run(() => saveKeywords(projectId, raw), () => setSaved(true));
      }}
      className="grid content-start gap-1.5"
    >
      <label htmlFor={id} className={labelClass}>
        Parole chiave per riconoscere gli appuntamenti
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="keywords"
          defaultValue={keywords.join(", ")}
          onChange={() => setSaved(false)}
          className={inputClass}
        />
        <Button type="submit" disabled={pending}>
          Salva
        </Button>
      </div>
      <p className="text-xs text-ink-3">
        {saved ? "Salvate." : "Separate da virgola. Cercate in titolo, luogo e descrizione degli eventi."}
      </p>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

export function AddDeliverable({ projectId }: { projectId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();

  if (!open) {
    return (
      <div className="border-t border-rule pt-3">
        <Button variant="quiet" size="sm" onClick={() => setOpen(true)}>
          <PlusIcon size={13} aria-hidden />
          Aggiungi consegna
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const start = String(form.get("start") ?? "");
        run(
          () =>
            createDeliverable(projectId, {
              title: String(form.get("title") ?? ""),
              contents: String(form.get("contents") ?? ""),
              startDate: start || null,
              dueDate: String(form.get("due") ?? ""),
            }),
          () => setOpen(false),
        );
      }}
      className="grid gap-4 border-t border-rule bg-wash/60 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem]">
        <Field label="Titolo" htmlFor={`${id}-title`}>
          <input id={`${id}-title`} name="title" required autoFocus className={inputClass} />
        </Field>
        <Field label="Inizio (facoltativo)" htmlFor={`${id}-start`}>
          <input id={`${id}-start`} name="start" type="date" className={inputClass} />
        </Field>
        <Field label="Scadenza" htmlFor={`${id}-due`}>
          <input id={`${id}-due`} name="due" type="date" required className={inputClass} />
        </Field>
      </div>
      <Field label="Contenuto" htmlFor={`${id}-contents`}>
        <input id={`${id}-contents`} name="contents" className={inputClass} />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" disabled={pending}>
          Aggiungi
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Annulla
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
