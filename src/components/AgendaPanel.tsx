"use client";

import { useId, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { refreshCalendar, saveCalendarUrl, setEventLink } from "@/app/actions";
import { isRelevant } from "@/lib/agenda";
import { dayOfMonth, daysBetween, fmtStamp, fmtWeekdayOnly } from "@/lib/dates";
import { relationText } from "@/lib/derive";
import type { AgendaItem, CalendarState } from "@/lib/types";
import { Button, ErrorText, Field, SectionTitle, cn, inputClass } from "./ui";
import { useAction } from "./use-action";

type ProjectRef = { id: string; code: string; name: string };

export function AgendaPanel({
  state,
  items,
  projects,
  today,
}: {
  state: CalendarState;
  items: AgendaItem[];
  projects: ProjectRef[];
  today: string;
}) {
  const relevant = items.filter(isRelevant);
  const others = items.filter((i) => !isRelevant(i));

  return (
    <section aria-labelledby="agenda-title">
      <SectionTitle id="agenda-title" aside={state.status === "ok" ? <RefreshButton /> : undefined}>
        Agenda
      </SectionTitle>

      {state.status === "missing" && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Collega il calendario c.frinolli@loquis.com per vedere gli appuntamenti vicini alle consegne.
          </p>
          <ConnectCalendar />
        </>
      )}

      {state.status === "error" && (
        <>
          <p role="alert" className="mt-3 text-sm font-medium leading-relaxed text-signal">
            {state.message}
          </p>
          <ConnectCalendar current={state.urlHint} />
        </>
      )}

      {state.status === "ok" && (
        <>
          <p className="mt-2 text-xs text-ink-3">Prossimi 30 giorni. Letto il {fmtStamp(state.fetchedAt)}.</p>
          {relevant.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Nessun appuntamento collegato ai progetti nei prossimi 30 giorni. Se ne manca uno, collegalo a mano tra gli
              altri appuntamenti oppure aggiungi una parola chiave al progetto.
            </p>
          ) : (
            <ol className="mt-4">
              {relevant.map((item) => (
                <EventLine key={item.key} item={item} projects={projects} today={today} />
              ))}
            </ol>
          )}
          {others.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="w-max cursor-pointer list-none text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
                Altri appuntamenti ({others.length})
              </summary>
              <ol className="mt-2">
                {others.map((item) => (
                  <EventLine key={item.key} item={item} projects={projects} today={today} />
                ))}
              </ol>
            </details>
          )}
          <ConnectCalendar current={state.urlHint} compact />
        </>
      )}
    </section>
  );
}

function EventLine({ item, projects, today }: { item: AgendaItem; projects: ProjectRef[]; today: string }) {
  const id = useId();
  const { pending, error, run } = useAction();
  const value = item.ignored ? "ignore" : item.source === "manual" ? item.projectIds[0] : "auto";
  const codes = item.projectIds.map((pid) => projects.find((p) => p.id === pid)?.code).filter(Boolean);
  const inDays = daysBetween(today, item.date);
  const when = item.allDay ? "Tutto il giorno" : `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ""}`;

  return (
    <li className={cn("grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-t border-rule py-3", item.ignored && "opacity-60")}>
      <div className="leading-none tabular-nums">
        <span className="block font-display text-3xl font-bold">{dayOfMonth(item.date)}</span>
        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-2">
          {inDays === 0 ? "oggi" : inDays === 1 ? "domani" : fmtWeekdayOnly(item.date)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        <p className="mt-0.5 text-xs text-ink-3">
          {when}
          {codes.length > 0 && `, progetto ${codes.join(" e ")}`}
          {item.location && `, ${item.location}`}
        </p>
        {item.relations.map((r) => (
          <p key={r.deliverableId} className="mt-1 text-xs font-medium text-ink">
            {relationText(r)}
          </p>
        ))}
        <label htmlFor={id} className="sr-only">
          Collegamento dell&rsquo;evento
        </label>
        <select
          id={id}
          value={value}
          disabled={pending}
          onChange={(e) => run(() => setEventLink(item.uid, e.target.value))}
          className="mt-2 h-7 max-w-full border border-rule-strong bg-sheet px-1.5 text-xs text-ink-2 hover:border-ink-3"
        >
          <option value="auto">{item.source === "keyword" ? "Riconosciuto dalle parole chiave" : "Automatico"}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              Collega a {p.code === "0" ? "Piattaforme attuali" : `${p.code}, ${p.name}`}
            </option>
          ))}
          <option value="ignore">Non rilevante</option>
        </select>
        <ErrorText>{error}</ErrorText>
      </div>
    </li>
  );
}

function RefreshButton() {
  const { pending, run } = useAction();
  return (
    <Button variant="quiet" size="sm" disabled={pending} onClick={() => run(() => refreshCalendar())}>
      <ArrowClockwiseIcon size={13} aria-hidden className={cn(pending && "animate-spin")} />
      Aggiorna
    </Button>
  );
}

function ConnectCalendar({ current, compact }: { current?: string; compact?: boolean }) {
  const id = useId();
  const [editing, setEditing] = useState(!compact);
  const { pending, error, run } = useAction();

  if (!editing) {
    return (
      <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule pt-3 text-xs text-ink-3">
        <span className="min-w-0 truncate">Collegato a {current}</span>
        <Button variant="quiet" size="sm" onClick={() => setEditing(true)}>
          Cambia indirizzo
        </Button>
        <Button variant="quiet" size="sm" disabled={pending} onClick={() => run(() => saveCalendarUrl(""))}>
          Scollega
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("ics") ?? "");
        run(() => saveCalendarUrl(raw), () => compact && setEditing(false));
      }}
      className="mt-4 grid gap-3"
    >
      {!compact && (
        <div className="text-sm leading-relaxed text-ink-2">
          <p>
            Il link di incorporamento funziona solo nel browser in cui sei entrato con l&rsquo;account Loquis: il server
            non può leggerlo. Serve l&rsquo;indirizzo segreto:
          </p>
          <ol className="mt-2 grid list-decimal gap-1 pl-5">
            <li>Apri Google Calendar con c.frinolli@loquis.com.</li>
            <li>
              Impostazioni, poi il calendario c.frinolli@loquis.com, poi{" "}
              <span className="font-semibold text-ink">Integra calendario</span>.
            </li>
            <li>
              Copia <span className="font-semibold text-ink">Indirizzo segreto in formato iCal</span> e incollalo qui.
            </li>
          </ol>
        </div>
      )}
      <Field label="Indirizzo segreto in formato iCal" htmlFor={id}>
        <input
          id={id}
          name="ics"
          type="url"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
          className={inputClass}
        />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Verifico" : "Collega"}
        </Button>
        {compact && (
          <Button variant="quiet" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
