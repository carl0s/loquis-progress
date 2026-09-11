import type { CSSProperties } from "react";
import { addDays, daysBetween, firstOfMonth, fmtDay, fmtMonthName, nextMonth, weekday } from "@/lib/dates";
import { isLate, shortTitle } from "@/lib/derive";
import { STATUS_LABEL, type AgendaItem, type Deliverable, type Project } from "@/lib/types";
import { Hatch, cn } from "./ui";

type Scale = { x: (iso: string, offsetDays?: number) => string; w: (days: number) => string };

const markTone = {
  done: "border border-ink bg-ink",
  late: "border-[1.5px] border-signal bg-signal-wash",
  todo: "border-[1.5px] border-ink bg-paper",
  active: "border border-ink bg-ink-3",
} as const;

const barTone = {
  done: "bg-ink",
  late: "border-[1.5px] border-signal bg-signal-wash",
  todo: "border-[1.5px] border-ink bg-paper",
  active: "bg-ink-3",
} as const;

export function Timeline({
  projects,
  events,
  today,
  showAgenda = true,
}: {
  projects: Project[];
  events: AgendaItem[];
  today: string;
  showAgenda?: boolean;
}) {
  const dated = projects.filter((p) => !p.ongoing && p.deliverables.length > 0);
  const dates = [today, ...dated.flatMap((p) => p.deliverables.flatMap((d) => [d.startDate ?? d.dueDate, d.dueDate]))];
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  const start = firstOfMonth(addDays(min, -3));
  const end = addDays(max, 12);
  const span = daysBetween(start, end);

  const scale: Scale = {
    x: (iso, offset = 0) => `${((daysBetween(start, iso) + offset) / span) * 100}%`,
    w: (days) => `${(days / span) * 100}%`,
  };

  const months: string[] = [];
  for (let m = start; m < end; m = nextMonth(m)) months.push(m);
  const mondays: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) if (weekday(d) === 1) mondays.push(d);

  const lane = events.filter((e) => !e.ignored && e.date >= start && e.date < end);

  return (
    <div>
      <div className="-mx-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 print:overflow-visible">
        <div className="relative min-w-[56rem]" style={{ "--label": "14rem" } as CSSProperties}>
          {/* Month rules sit behind every row. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-[var(--label)]">
            {months.map((m) => (
              <span key={m} className="absolute inset-y-0 w-px bg-rule" style={{ left: scale.x(m) }} />
            ))}
          </div>

          <div className="grid grid-cols-[var(--label)_1fr]">
            <div />
            <div className="relative h-11 border-b border-ink">
              {months.map((m) => (
                <span
                  key={m}
                  className="absolute bottom-2 pl-2 font-display text-lg font-semibold leading-none first-letter:uppercase"
                  style={{ left: scale.x(m) }}
                >
                  {fmtMonthName(m)}
                </span>
              ))}
              {mondays.map((d) => (
                <span key={d} className="absolute bottom-0 h-1.5 w-px bg-ink-3" style={{ left: scale.x(d) }} />
              ))}
            </div>
          </div>

          {showAgenda && (
            <div className="grid grid-cols-[var(--label)_1fr] items-center border-b border-rule">
              <span className="py-1.5 pr-3 text-[13px] font-semibold text-ink-2">Agenda Loquis</span>
              <div className="relative h-8">
                {lane.map((e) => (
                  <span
                    key={e.key}
                    title={`${fmtDay(e.date)}${e.startTime ? ` ${e.startTime}` : ""}, ${e.title}`}
                    className={cn(
                      "absolute top-2 bottom-2 w-0.5 -translate-x-1/2",
                      e.projectIds.length > 0 ? "bg-ink" : "bg-rule-strong",
                    )}
                    style={{ left: scale.x(e.date, 0.5) }}
                  />
                ))}
              </div>
            </div>
          )}

          {dated.map((p) => (
            <div key={p.id} className="mt-4">
              <div className="grid grid-cols-[var(--label)_1fr] border-b border-rule-strong">
                <a href={`#p-${p.id}`} className="flex min-w-0 items-baseline gap-2 py-1 pr-3 hover:underline">
                  <span className="font-display text-xl font-bold leading-none">{p.code}</span>
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                </a>
                <div />
              </div>
              {p.deliverables.map((d) => (
                <Track key={d.id} d={d} today={today} scale={scale} />
              ))}
            </div>
          ))}

          {/* Today is drawn last, above everything. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-[var(--label)]">
            <span className="absolute inset-y-0 w-px bg-signal" style={{ left: scale.x(today, 0.5) }}>
              <span className="absolute top-0 left-1.5 whitespace-nowrap bg-paper px-1 text-[11px] font-semibold uppercase tracking-wider text-signal">
                Oggi
              </span>
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-2">
        <li className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2.5 rotate-45", markTone.todo)} />
          Consegna
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className={cn("h-2.5 w-6", barTone.active)} />
          Periodo in corso
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2.5 rotate-45", markTone.done)} />
          Consegnata
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2.5 rotate-45", markTone.late)} />
          Oltre la data
        </li>
        <li className="flex items-center gap-2">
          <Hatch className="h-3 w-6" />
          Attesa esterna
        </li>
        {showAgenda && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-0.5 bg-ink" />
            Appuntamento collegato
          </li>
        )}
      </ul>
    </div>
  );
}

function Track({ d, today, scale }: { d: Deliverable; today: string; scale: Scale }) {
  const late = isLate(d, today);
  const tone = d.status === "done" ? "done" : late ? "late" : d.status === "todo" ? "todo" : "active";
  const when = d.startDate ? `${fmtDay(d.startDate)} - ${fmtDay(d.dueDate)}` : fmtDay(d.dueDate);
  const tip = `${d.title}: ${when}, ${STATUS_LABEL[d.status].toLowerCase()}`;

  return (
    <div className="grid grid-cols-[var(--label)_1fr] items-center hover:bg-wash/70">
      <a href={`#d-${d.id}`} className="truncate py-1.5 pr-3 text-[13px] text-ink-2 hover:text-ink hover:underline">
        {shortTitle(d.title)}
      </a>
      <div className="relative h-8">
        {d.blockers.map((b) => {
          const until = b.resolvedOn ?? today;
          return (
            <span
              key={b.id}
              title={`In attesa di ${b.party}${b.reason ? `: ${b.reason}` : ""} (${fmtDay(b.openedOn)} - ${
                b.resolvedOn ? fmtDay(b.resolvedOn) : "in corso"
              })`}
              className={cn("absolute inset-y-1", b.resolvedOn ? "hatch-soft" : "hatch")}
              style={{ left: scale.x(b.openedOn), width: scale.w(daysBetween(b.openedOn, until) + 1) }}
            />
          );
        })}
        {d.startDate ? (
          <span
            title={tip}
            className={cn("absolute top-1/2 h-2.5 -translate-y-1/2", barTone[tone])}
            style={{ left: scale.x(d.startDate), width: scale.w(daysBetween(d.startDate, d.dueDate) + 1) }}
          />
        ) : (
          <span
            title={tip}
            className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45", markTone[tone])}
            style={{ left: scale.x(d.dueDate, 0.5) }}
          />
        )}
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 pl-2.5 text-[11px] tabular-nums whitespace-nowrap",
            late ? "font-semibold text-signal" : "text-ink-3",
          )}
          style={{ left: scale.x(d.dueDate, 1) }}
        >
          {fmtDay(d.dueDate)}
        </span>
      </div>
    </div>
  );
}
