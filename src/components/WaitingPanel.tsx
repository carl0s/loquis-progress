"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { resolveBlocker } from "@/app/actions";
import { fmtDay, plural } from "@/lib/dates";
import { blockerDays, shortTitle, waitingSince } from "@/lib/derive";
import type { Blocker } from "@/lib/types";
import { Button, ErrorText, Hatch, SectionTitle } from "./ui";
import { useAction } from "./use-action";

export type WaitingRow = Blocker & { code: string; deliverableTitle: string };

export function WaitingPanel({ rows, today, readOnly }: { rows: WaitingRow[]; today: string; readOnly?: boolean }) {
  const open = rows.filter((r) => !r.resolvedOn);
  const closed = rows.filter((r) => r.resolvedOn);
  const openDays = open.reduce((sum, r) => sum + blockerDays(r, today), 0);
  const totalDays = rows.reduce((sum, r) => sum + blockerDays(r, today), 0);

  return (
    <section id="attese" aria-labelledby="attese-title" className="scroll-mt-8">
      <SectionTitle id="attese-title">Attese esterne</SectionTitle>

      {rows.length === 0 ? (
        <div className="mt-4 grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
          <Hatch className="h-6 w-10" />
          {readOnly ? (
            <p className="text-sm leading-relaxed text-ink-2">Nessuna attesa esterna registrata.</p>
          ) : (
            <p className="text-sm leading-relaxed text-ink-2">
              Nessuna attesa registrata. Quando una consegna è ferma per qualcun altro, aprila in Consegne e premi{" "}
              <span className="font-semibold text-ink">Segna in attesa di terzi</span>: i giorni si contano da soli e
              finiscono nell&rsquo;export.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3">
            <span className="font-display text-5xl font-bold leading-none tabular-nums">{openDays}</span>
            <span className="text-sm leading-snug text-ink-2">
              {openDays === 1 ? "giorno" : "giorni"} di attesa in corso su{" "}
              {plural(open.length, "attesa aperta", "attese aperte")}. Totale registrato:{" "}
              {plural(totalDays, "giorno", "giorni")}.
            </span>
          </p>

          {open.length > 0 && (
            <ul className="mt-4 grid gap-px border border-rule bg-rule">
              {open.map((r) => (
                <OpenLine key={r.id} row={r} today={today} readOnly={readOnly} />
              ))}
            </ul>
          )}

          {closed.length > 0 && (
            <details className="mt-4 text-sm" open={readOnly}>
              <summary className="w-max cursor-pointer list-none text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
                Risolte ({closed.length})
              </summary>
              <ul className="mt-2 divide-y divide-rule">
                {closed.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 py-2">
                    <Hatch soft className="mt-0.5 h-4 w-6" />
                    <div className="min-w-0">
                      <p>
                        <span className="font-semibold">{r.party}</span>
                        <span className="text-ink-2">
                          {" "}
                          su {r.code} {shortTitle(r.deliverableTitle)}
                        </span>
                      </p>
                      <p className="text-xs tabular-nums text-ink-3">
                        {fmtDay(r.openedOn)} - {fmtDay(r.resolvedOn!)}, {plural(blockerDays(r, today), "giorno", "giorni")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {!readOnly && (
            <a
              href="/api/attese"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink"
            >
              <DownloadSimpleIcon size={14} aria-hidden />
              Esporta registro attese (CSV)
            </a>
          )}
        </>
      )}
    </section>
  );
}

function OpenLine({ row, today, readOnly }: { row: WaitingRow; today: string; readOnly?: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 bg-sheet px-3 py-3">
      <Hatch className="mt-0.5 h-4 w-6" />
      <div className="min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{row.party}</span> {waitingSince(blockerDays(row, today))}
        </p>
        <a href={`#d-${row.deliverableId}`} className="mt-0.5 block text-xs text-ink-2 hover:text-ink hover:underline">
          {row.code} {shortTitle(row.deliverableTitle)}
          {row.reason && `: ${row.reason}`}
        </a>
        {!readOnly && (
          <Button size="sm" className="mt-2" disabled={pending} onClick={() => run(() => resolveBlocker(row.id, today))}>
            Risolta oggi
          </Button>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </li>
  );
}
