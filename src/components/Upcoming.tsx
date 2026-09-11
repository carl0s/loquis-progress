import { dayOfMonth, fmtDay, fmtMonthShort } from "@/lib/dates";
import { dueState, type Item } from "@/lib/derive";
import { Hatch, cn } from "./ui";

export function Upcoming({ items, today, readOnly }: { items: Item[]; today: string; readOnly?: boolean }) {
  if (items.length === 0) {
    return (
      <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
        {readOnly
          ? "Nessuna consegna aperta in calendario."
          : "Nessuna consegna aperta in calendario. Le nuove scadenze si aggiungono dal registro Consegne, sotto ogni progetto."}
      </p>
    );
  }

  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {items.map(({ p, d }, index) => {
        const state = dueState(d, today);
        const waiting = d.blockers.filter((b) => !b.resolvedOn);
        const urgent = state.tone === "today";
        return (
          <li key={d.id}>
            <a
              href={`#d-${d.id}`}
              className="group grid grid-cols-[4rem_1.75rem_minmax(0,1fr)] items-start gap-x-3 py-4 transition-colors hover:bg-wash/70 sm:grid-cols-[5.5rem_2.5rem_minmax(0,1fr)] sm:gap-x-4"
            >
              <span className="text-right leading-none tabular-nums">
                <span
                  className={cn(
                    "block font-display font-bold tracking-tight",
                    index === 0 ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl",
                    urgent && "text-signal",
                  )}
                >
                  {dayOfMonth(d.dueDate)}
                </span>
                <span className="mt-1 block font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink-2">
                  {fmtMonthShort(d.dueDate)}
                </span>
              </span>
              <span className="pt-1 font-display text-3xl font-bold leading-none text-ink-3">{p.code}</span>
              <span className="min-w-0 pt-1">
                <span className="block text-base font-semibold leading-snug group-hover:underline">{d.title}</span>
                <span className="mt-1 block text-sm text-ink-2">{p.name}</span>
                <span className={cn("mt-1.5 block text-sm font-medium", urgent ? "text-signal" : "text-ink")}>
                  {state.text}
                  {d.startDate && d.startDate <= today && `, periodo iniziato il ${fmtDay(d.startDate)}`}
                </span>
                {waiting.length > 0 && (
                  <span className="mt-2 flex items-center gap-2 text-xs text-ink-2">
                    <Hatch className="h-3 w-5" />
                    In attesa di {waiting.map((b) => b.party).join(", ")}
                  </span>
                )}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
