import type { Project } from "@/lib/types";
import { DeliverableRow } from "./DeliverableRow";
import { AddDeliverable, KeywordsForm } from "./ProjectTools";
import { labelClass } from "./ui";

export function ProjectLedger({ project: p, today, parties }: { project: Project; today: string; parties: string[] }) {
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
          <details className="mt-3 text-sm">
            <summary className="w-max cursor-pointer list-none text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
              Criteri di verifica e parole chiave agenda
            </summary>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className={labelClass}>Criteri di verifica</h4>
                <ul className="mt-2 grid gap-1.5">
                  {p.criteria.map((c) => (
                    <li key={c} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 leading-snug">
                      <span aria-hidden className="mt-2.5 h-px w-3 bg-ink-3" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <KeywordsForm projectId={p.id} keywords={p.keywords} />
            </div>
          </details>
        </div>
      </div>

      <ol className="mt-5">
        {p.deliverables.map((d) => (
          <DeliverableRow key={d.id} d={d} today={today} parties={parties} />
        ))}
      </ol>
      <AddDeliverable projectId={p.id} />
    </section>
  );
}
