"use client";

import { useId, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { addHours, deleteHours } from "@/app/actions";
import { fmtDay, fmtMonthName, fmtMonthYear, monthKey } from "@/lib/dates";
import {
  DAY_HOURS,
  MONTH_CAP_DAYS,
  MONTH_CAP_MINUTES,
  RATE_DAY,
  RATE_HOUR,
  amount,
  billable,
  eur,
  fmtDuration,
  fmtHourValue,
  fmtHours,
  parseDuration,
} from "@/lib/hours";
import type { HourEntry } from "@/lib/types";
import { Button, ErrorText, Field, SectionTitle, cn, inputClass } from "./ui";
import { useAction } from "./use-action";

const CELLS_PER_DAY = (DAY_HOURS * 60) / 30;

export function BandiHours({ entries, today, readOnly }: { entries: HourEntry[]; today: string; readOnly?: boolean }) {
  const current = monthKey(today);
  const billedIn = (key: string) =>
    entries.filter((e) => monthKey(e.date) === key).reduce((sum, e) => sum + billable(e.minutes), 0);
  const billedNow = billedIn(current);
  const filled = Math.min(MONTH_CAP_DAYS * CELLS_PER_DAY, billedNow / 30);
  const over = billedNow - MONTH_CAP_MINUTES;

  const groups: [string, HourEntry[]][] = [];
  for (const e of entries) {
    const key = monthKey(e.date);
    const last = groups[groups.length - 1];
    if (last && last[0] === key) last[1].push(e);
    else groups.push([key, [e]]);
  }

  return (
    <section aria-labelledby="bandi-title">
      <SectionTitle id="bandi-title">Bandi e candidature</SectionTitle>
      <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink-2">
        Attività addizionale a consumo: {eur.format(RATE_HOUR)} l&rsquo;ora o {eur.format(RATE_DAY)} la giornata di{" "}
        {DAY_HOURS} ore, IVA esclusa, fino a {MONTH_CAP_DAYS} giornate in più al mese. Le frazioni si arrotondano alla
        mezz&rsquo;ora superiore, voce per voce.
      </p>

      <div className="mt-6">
        <p className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3">
          <span className="font-display text-5xl font-bold leading-none tabular-nums">{fmtHourValue(billedNow)}</span>
          <span className="text-sm leading-snug text-ink-2">
            ore fatturabili a {fmtMonthName(today)} su {MONTH_CAP_DAYS * DAY_HOURS}, pari a{" "}
            <span className="font-semibold text-ink">{eur.format(amount(billedNow))}</span>
          </span>
        </p>
        <div
          role="img"
          aria-label={`${fmtHours(billedNow)} su ${MONTH_CAP_DAYS * DAY_HOURS} ore disponibili nel mese`}
          className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4"
        >
          {Array.from({ length: MONTH_CAP_DAYS }, (_, day) => (
            <div key={day}>
              <div className="flex gap-px">
                {Array.from({ length: CELLS_PER_DAY }, (_, k) => (
                  <span
                    key={k}
                    className={cn("h-5 flex-1", day * CELLS_PER_DAY + k < filled ? "bg-ink" : "border border-rule-strong")}
                  />
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-ink-3">Giornata {day + 1}</span>
            </div>
          ))}
        </div>
        {over > 0 && (
          <p className="mt-3 text-sm font-medium text-signal">
            Oltre il tetto mensile: {fmtHours(over)} in eccesso, da concordare.
          </p>
        )}
      </div>

      {!readOnly && <HoursForm today={today} />}

      {groups.length === 0 ? (
        <p className="mt-6 max-w-[56ch] text-sm leading-relaxed text-ink-2">
          {readOnly
            ? "Nessuna ora registrata finora."
            : "Nessuna ora registrata. Annota qui il tempo speso su ogni bando: il mese si somma da solo con tariffa e tetto del listino."}
        </p>
      ) : (
        groups.map(([key, list]) => {
          const billed = billedIn(key);
          return (
            <div key={key} className="mt-8">
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-4 font-display text-xl font-semibold">
                <span className="first-letter:uppercase">{fmtMonthYear(key)}</span>
                <span className="font-sans text-sm font-medium tabular-nums text-ink-2">
                  {fmtHours(billed)}, {eur.format(amount(billed))}
                </span>
              </h3>
              <ul className="mt-2 divide-y divide-rule border-t border-rule">
                {list.map((e) => (
                  <HourLine key={e.id} entry={e} readOnly={readOnly} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function HoursForm({ today }: { today: string }) {
  const id = useId();
  const { pending, error, run } = useAction();
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const minutes = parseDuration(duration);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const date = String(new FormData(e.currentTarget).get("date") ?? "");
        run(
          () => addHours({ date, duration, description }),
          () => {
            setDuration("");
            setDescription("");
          },
        );
      }}
      className="mt-8 grid gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-[9.5rem_7rem_minmax(0,1fr)]">
        <Field label="Data" htmlFor={`${id}-date`}>
          <input id={`${id}-date`} name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Durata" htmlFor={`${id}-duration`}>
          <input
            id={`${id}-duration`}
            required
            inputMode="decimal"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1:30"
            aria-describedby={`${id}-preview`}
            className={inputClass}
          />
        </Field>
        <Field label="Bando o attività" htmlFor={`${id}-desc`}>
          <input
            id={`${id}-desc`}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={`${id}-preview`} className="text-xs text-ink-3" aria-live="polite">
          {duration.trim() === ""
            ? "Formati accettati: 1:30, 1,5, 1h30, 45m."
            : minutes && minutes > 0
              ? `${fmtDuration(minutes)}, fatturabili ${fmtHours(billable(minutes))}`
              : "Durata non riconosciuta."}
        </p>
        <Button type="submit" variant="primary" disabled={pending || !minutes || !description.trim()}>
          Registra ore
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

function HourLine({ entry, readOnly }: { entry: HourEntry; readOnly?: boolean }) {
  const { pending, error, run } = useAction();
  const billed = billable(entry.minutes);
  return (
    <li className="group grid grid-cols-[3.75rem_minmax(0,1fr)_auto_auto] items-start gap-x-3 py-2.5">
      <span className="text-sm tabular-nums text-ink-2">{fmtDay(entry.date)}</span>
      <div className="min-w-0">
        <p className="text-sm leading-snug">{entry.description}</p>
        <ErrorText>{error}</ErrorText>
      </div>
      <span className="text-right text-xs tabular-nums text-ink-2">
        {fmtDuration(entry.minutes)}
        {billed !== entry.minutes && <span className="block text-ink-3">fatt. {fmtHours(billed)}</span>}
      </span>
      {!readOnly && (
        <button
          type="button"
          aria-label={`Elimina le ore del ${fmtDay(entry.date)}`}
          disabled={pending}
          onClick={() => run(() => deleteHours(entry.id))}
          className="grid size-7 place-items-center text-ink-3 opacity-60 transition-opacity hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
        >
          <XIcon size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}
