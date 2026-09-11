import { fmtDay, plural } from "@/lib/dates";
import { blockerDays, dueState, isLate, waitingSince } from "@/lib/derive";
import { STATUS_LABEL, type Project } from "@/lib/types";
import { StatusGlyph } from "./DeliverableRow";
import { Hatch, SectionTitle, cn, labelClass } from "./ui";

// Read-only counterparts of the owner's ledger. No notes, no forms.

export function ProgressSummary({
  projects,
  openWaiting,
  waitingDays,
}: {
  projects: Project[];
  openWaiting: number;
  waitingDays: number;
}) {
  return (
    <section aria-labelledby="summary-title">
      <SectionTitle id="summary-title">Riepilogo</SectionTitle>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {projects.map((p) => {
          const done = p.deliverables.filter((d) => d.status === "done").length;
          return (
            <li key={p.id}>
              <a
                href={`#p-${p.id}`}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-3 transition-colors hover:bg-wash/70"
              >
                <span className="font-display text-2xl font-bold leading-none text-ink-3">{p.code}</span>
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-sm tabular-nums text-ink-2">
                  {done} di {p.deliverables.length} consegnate
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 flex items-start gap-3 text-[15px] leading-relaxed">
        <Hatch soft={openWaiting === 0} className="mt-1 h-4 w-6" />
        <span>
          {openWaiting === 0
            ? "Nessuna attesa esterna aperta."
            : `${plural(openWaiting, "attesa esterna aperta", "attese esterne aperte")}, ${plural(
                waitingDays,
                "giorno",
                "giorni",
              )} di attesa accumulati.`}
        </span>
      </p>
    </section>
  );
}

export function ClientLedger({ project: p, today }: { project: Project; today: string }) {
  const done = p.deliverables.filter((d) => d.status === "done").length;

  return (
    <section id={`p-${p.id}`} aria-labelledby={`p-${p.id}-title`} className="scroll-mt-8 border-t-2 border-ink pt-5">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <span aria-hidden className="font-display text-5xl font-bold leading-[0.82] sm:text-6xl">
          {p.code}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h3 id={`p-${p.id}-title`} className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
              <span className="sr-only">Progetto {p.code}: </span>
              {p.name}
            </h3>
            <p className="text-sm tabular-nums text-ink-2">
              {done} di {p.deliverables.length} consegnate
            </p>
          </div>
          <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">{p.objective}</p>
          <div className="mt-3">
            <h4 className={labelClass}>Criteri di verifica</h4>
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
              {p.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ol className="mt-5">
        {p.deliverables.map((d) => {
          const state = dueState(d, today);
          const late = isLate(d, today);
          return (
            <li
              key={d.id}
              id={`d-${d.id}`}
              className="grid scroll-mt-8 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 border-t border-rule py-3.5"
            >
              <span className="pt-0.5">
                <StatusGlyph status={d.status} late={late} />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug">{d.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{d.contents}</p>
                <p className="mt-1 text-xs font-semibold text-ink-2">{STATUS_LABEL[d.status]}</p>
                {d.blockers.map((b) => {
                  const days = blockerDays(b, today);
                  return (
                    <p key={b.id} className="mt-2 flex items-start gap-2 text-xs leading-snug">
                      <Hatch soft={Boolean(b.resolvedOn)} className="mt-0.5 h-3.5 w-5" />
                      <span>
                        {b.resolvedOn
                          ? `Attesa di ${b.party} dal ${fmtDay(b.openedOn)} al ${fmtDay(b.resolvedOn)}, ${plural(days, "giorno", "giorni")}`
                          : `In attesa di ${b.party} ${waitingSince(days)}`}
                        {b.reason && <span className="text-ink-2">: {b.reason}</span>}
                      </span>
                    </p>
                  );
                })}
                {d.notes.length > 0 && (
                  <ul className="mt-2.5 grid gap-1.5 border-t border-rule pt-2">
                    {[...d.notes].reverse().map((n) => (
                      <li key={n.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-relaxed">
                        <span className="tabular-nums text-ink-3">{fmtDay(n.date)}</span>
                        <span className="whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{n.body}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pl-2 text-right">
                <span
                  className={cn(
                    "block font-display font-semibold leading-none tabular-nums whitespace-nowrap",
                    d.startDate ? "text-lg" : "text-xl",
                  )}
                >
                  {d.startDate ? `${fmtDay(d.startDate)} - ${fmtDay(d.dueDate)}` : fmtDay(d.dueDate)}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-xs",
                    state.tone === "late" || state.tone === "today" ? "font-semibold text-signal" : "text-ink-3",
                  )}
                >
                  {state.text}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
