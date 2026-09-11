"use client";

import { useId, useState, type CSSProperties } from "react";
import { XIcon } from "@phosphor-icons/react";
import { addLogEntry, deleteLogEntry } from "@/app/actions";
import { fmtDay, fmtMonthShort, fmtMonthYear, monthKey } from "@/lib/dates";
import { LOG_KIND_LABEL, PLATFORMS, type LogEntry, type LogKind } from "@/lib/types";
import { Button, ErrorText, Field, SectionTitle, cn, inputClass, labelClass } from "./ui";
import { useAction } from "./use-action";

export function PlatformsLog({
  project,
  entries,
  months,
  today,
  readOnly,
}: {
  project: { name: string; objective: string; criteria: string[] };
  entries: LogEntry[];
  months: string[];
  today: string;
  readOnly?: boolean;
}) {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(monthKey(e.date), (counts.get(monthKey(e.date)) ?? 0) + 1);
  const current = monthKey(today);

  const groups: [string, LogEntry[]][] = [];
  for (const e of entries) {
    const key = monthKey(e.date);
    const last = groups[groups.length - 1];
    if (last && last[0] === key) last[1].push(e);
    else groups.push([key, [e]]);
  }

  return (
    <section aria-labelledby="ong-title">
      <SectionTitle id="ong-title">Piattaforme attuali</SectionTitle>
      <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{project.objective}</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
        {project.criteria.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <ol
        aria-label="Voci registrate per mese"
        className="mt-6 grid grid-cols-[repeat(var(--n),minmax(0,1fr))] border-y border-ink"
        style={{ "--n": months.length } as CSSProperties}
      >
        {months.map((m) => {
          const n = counts.get(m) ?? 0;
          const past = m < current;
          const isCurrent = m === current;
          const missing = past && n === 0;
          return (
            <li key={m} className={cn("border-l border-rule px-2.5 py-2.5 first:border-l-0 sm:px-3", isCurrent && "bg-wash")}>
              <span className="block font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink-2">
                {fmtMonthShort(`${m}-01`)}
              </span>
              <span
                className={cn(
                  "mt-1 block font-display text-3xl font-bold leading-none tabular-nums",
                  missing && "text-signal",
                  !past && !isCurrent && "text-ink-3",
                )}
              >
                {n}
              </span>
              <span className={cn("mt-1 block text-[11px]", missing ? "font-semibold text-signal" : "text-ink-3")}>
                {missing ? "nessun riscontro" : isCurrent ? "mese in corso" : n === 1 ? "voce" : "voci"}
              </span>
            </li>
          );
        })}
      </ol>

      {!readOnly && <LogForm today={today} />}

      {groups.length === 0 ? (
        <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-ink-2">
          {readOnly
            ? "Nessuna voce registrata finora."
            : "Il contratto chiede un riscontro documentato ogni mese. Registra qui piani, review e interventi rilasciati su loquis.com, loquis.biz, Loquis Studio e social: ogni voce finisce nel suo mese."}
        </p>
      ) : (
        groups.map(([key, list]) => (
          <div key={key} className="mt-8">
            <h3 className="font-display text-xl font-semibold first-letter:uppercase">{fmtMonthYear(key)}</h3>
            <ul className="mt-2 divide-y divide-rule border-t border-rule">
              {list.map((e) => (
                <LogLine key={e.id} entry={e} readOnly={readOnly} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function LogForm({ today }: { today: string }) {
  const id = useId();
  const { pending, error, run } = useAction();
  const [description, setDescription] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        run(
          () =>
            addLogEntry({
              date: String(form.get("date") ?? ""),
              kind: String(form.get("kind") ?? "intervento") as LogKind,
              platform: String(form.get("platform") ?? ""),
              description,
            }),
          () => setDescription(""),
        );
      }}
      className="mt-6 grid gap-3"
    >
      <span className={labelClass}>Nuova voce</span>
      <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Data" htmlFor={`${id}-date`}>
          <input id={`${id}-date`} name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Tipo" htmlFor={`${id}-kind`}>
          <select id={`${id}-kind`} name="kind" defaultValue="intervento" className={inputClass}>
            {(Object.keys(LOG_KIND_LABEL) as LogKind[]).map((k) => (
              <option key={k} value={k}>
                {LOG_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Piattaforma" htmlFor={`${id}-platform`}>
          <select id={`${id}-platform`} name="platform" defaultValue={PLATFORMS[0]} className={inputClass}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="Cosa è stato fatto" htmlFor={`${id}-desc`}>
          <input
            id={`${id}-desc`}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={pending || !description.trim()}>
          Registra
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

function LogLine({ entry, readOnly }: { entry: LogEntry; readOnly?: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <li className="group grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5">
      <span className="text-sm tabular-nums text-ink-2">{fmtDay(entry.date)}</span>
      <div className="min-w-0">
        <p className="text-sm leading-snug">{entry.description}</p>
        <p className="mt-0.5 text-xs text-ink-3">
          {LOG_KIND_LABEL[entry.kind]}, {entry.platform}
        </p>
        <ErrorText>{error}</ErrorText>
      </div>
      {!readOnly && (
        <button
          type="button"
          aria-label={`Elimina la voce del ${fmtDay(entry.date)}`}
          disabled={pending}
          onClick={() => run(() => deleteLogEntry(entry.id))}
          className="grid size-7 place-items-center text-ink-3 opacity-60 transition-opacity hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
        >
          <XIcon size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}
