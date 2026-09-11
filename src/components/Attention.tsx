"use client";

import { updateDeliverable } from "@/app/actions";
import { daysBetween, fmtDay, plural } from "@/lib/dates";
import { Button, ErrorText, Hatch, SectionTitle } from "./ui";
import { useAction } from "./use-action";

type LateItem = { id: number; code: string; title: string; dueDate: string };

export function Attention({
  late,
  waiting,
  today,
}: {
  late: LateItem[];
  waiting: { count: number; days: number };
  today: string;
}) {
  const calm = late.length === 0 && waiting.count === 0;

  return (
    <section aria-labelledby="attention-title">
      <SectionTitle id="attention-title">Da sistemare</SectionTitle>

      {calm && (
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
          Niente in sospeso: le date passate sono tutte chiuse e nessuna consegna è ferma per altri.
        </p>
      )}

      {late.length > 0 && (
        <div className="mt-4">
          <p className="text-[15px] leading-relaxed">
            <span className="font-semibold text-signal">{plural(late.length, "consegna", "consegne")}</span> oltre la data
            senza stato &ldquo;consegnata&rdquo;.
          </p>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {late.map((item) => (
              <LateRow key={item.id} item={item} today={today} />
            ))}
          </ul>
        </div>
      )}

      {waiting.count > 0 && (
        <p className="mt-6 flex items-start gap-3 text-[15px] leading-relaxed">
          <Hatch className="mt-1 h-4 w-6" />
          <span>
            {plural(waiting.count, "attesa esterna aperta", "attese esterne aperte")},{" "}
            {plural(waiting.days, "giorno", "giorni")} di attesa accumulati.{" "}
            <a href="#attese" className="text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
              Vedi il registro
            </a>
          </span>
        </p>
      )}
    </section>
  );
}

function LateRow({ item, today }: { item: LateItem; today: string }) {
  const { pending, error, run } = useAction();

  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 py-3">
      <span className="font-display text-xl font-bold leading-none text-ink-3">{item.code}</span>
      <div className="min-w-0">
        <a href={`#d-${item.id}`} className="block text-sm font-medium leading-snug hover:underline">
          {item.title}
        </a>
        <p className="mt-0.5 text-xs text-ink-2">
          Prevista il {fmtDay(item.dueDate)}, {plural(daysBetween(item.dueDate, today), "giorno", "giorni")} fa
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => updateDeliverable(item.id, { status: "done", doneOn: item.dueDate }))}
          >
            Consegnata il {fmtDay(item.dueDate)}
          </Button>
          <a
            href={`#d-${item.id}`}
            className="text-xs text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink"
          >
            Altro stato
          </a>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </li>
  );
}
