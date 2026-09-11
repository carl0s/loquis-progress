"use client";

import { useEffect, useId, useOptimistic, useState, type FormEvent } from "react";
import { CaretDownIcon, CheckCircleIcon, CircleHalfIcon, CircleIcon, HourglassIcon } from "@phosphor-icons/react";
import {
  addNote,
  deleteBlocker,
  deleteDeliverable,
  deleteNote,
  openBlocker,
  reopenBlocker,
  resolveBlocker,
  setNoteShared,
  updateDeliverable,
  updateNote,
  type DeliverablePatch,
} from "@/app/actions";
import { fmtDay, isValidISO, plural } from "@/lib/dates";
import { blockerDays, dueState, isLate, waitingSince } from "@/lib/derive";
import { STATUS_LABEL, STATUS_ORDER, type Blocker, type Deliverable, type Note, type Status } from "@/lib/types";
import { Button, ErrorText, Field, Hatch, cn, inputClass, labelClass } from "./ui";
import { useAction } from "./use-action";

export function StatusGlyph({ status, late }: { status: Status; late?: boolean }) {
  const tone = late ? "text-signal" : "text-ink";
  if (status === "done") return <CheckCircleIcon size={20} weight="fill" className="text-ink" aria-hidden />;
  if (status === "review") return <HourglassIcon size={20} className={tone} aria-hidden />;
  if (status === "doing") return <CircleHalfIcon size={20} weight="fill" className={tone} aria-hidden />;
  return <CircleIcon size={20} className={tone} aria-hidden />;
}

export function DeliverableRow({ d, today, parties }: { d: Deliverable; today: string; parties: string[] }) {
  const [open, setOpen] = useState(false);
  const [waitingForm, setWaitingForm] = useState(false);
  const [status, setOptimisticStatus] = useOptimistic(d.status);
  const panelId = useId();
  const { pending, error, run } = useAction();

  // Links like #d-12 (from the timeline or "Da sistemare") unfold the row.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === `#d-${d.id}`) setOpen(true);
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", sync);
    };
  }, [d.id]);

  const view = { ...d, status };
  const late = isLate(view, today);
  const state = dueState(view, today);
  const waiting = d.blockers.filter((b) => !b.resolvedOn);

  const save = (patch: DeliverablePatch) => run(() => updateDeliverable(d.id, patch));
  const changeStatus = (next: Status) =>
    run(async () => {
      setOptimisticStatus(next);
      return updateDeliverable(d.id, { status: next });
    });

  return (
    <li id={`d-${d.id}`} className="scroll-mt-8 border-t border-rule">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3.5 text-left transition-colors hover:bg-wash/70"
      >
        <span className="pt-0.5">
          <StatusGlyph status={status} late={late} />
          <span className="sr-only">{STATUS_LABEL[status]}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug">{d.title}</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-ink-2">{d.contents}</span>
          {waiting.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-2">
              {waiting.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-2 border border-ink/40 bg-sheet py-0.5 pl-1 pr-2 text-xs">
                  <Hatch className="h-3.5 w-5 border-0" />
                  In attesa di <strong className="font-semibold">{b.party}</strong> {waitingSince(blockerDays(b, today))}
                </span>
              ))}
            </span>
          )}
          {d.notes[0] && !open && (
            <span className="mt-1.5 block truncate text-sm text-ink-3">
              <span className="tabular-nums">{fmtDay(d.notes[0].date)}</span>: <span className="italic">{d.notes[0].body}</span>
            </span>
          )}
        </span>
        <span className="flex items-start gap-3 pl-2 text-right">
          <span>
            <span
              className={cn(
                "block font-display font-semibold leading-none tabular-nums whitespace-nowrap",
                d.startDate ? "text-xl" : "text-2xl",
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
          </span>
          <CaretDownIcon
            size={16}
            aria-hidden
            className={cn("mt-1 text-ink-3 transition-transform duration-300", open && "rotate-180")}
          />
        </span>
      </button>

      <div id={panelId} className="fold" data-open={open} inert={!open}>
        <div>
          <div className="grid gap-6 pb-7 pt-2 sm:pl-9">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <StatusControl status={status} onChange={changeStatus} />
              <div className="grid gap-2">
                <span className={labelClass}>Dipendenza esterna</span>
                <button
                  type="button"
                  aria-expanded={waitingForm}
                  aria-controls={`${panelId}-waiting`}
                  onClick={() => setWaitingForm((value) => !value)}
                  className={cn(
                    "flex h-9 items-center gap-2 border px-3.5 text-sm transition-colors",
                    waitingForm ? "border-ink bg-wash font-semibold" : "border-ink/70 hover:bg-wash",
                  )}
                >
                  <Hatch className="h-3.5 w-5" />
                  {waiting.length > 0 ? "Aggiungi un'altra attesa" : "Segna in attesa di terzi"}
                </button>
              </div>
            </div>

            {(d.blockers.length > 0 || waitingForm) && (
              <Blockers
                id={`${panelId}-waiting`}
                d={d}
                today={today}
                parties={parties}
                formOpen={waitingForm}
                onClose={() => setWaitingForm(false)}
              />
            )}

            <Notes d={d} today={today} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Inizio, se è un periodo" htmlFor={`${panelId}-start`}>
                <input
                  id={`${panelId}-start`}
                  type="date"
                  defaultValue={d.startDate ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") save({ startDate: null });
                    else if (isValidISO(value)) save({ startDate: value });
                  }}
                  className={inputClass}
                />
              </Field>
              <Field label="Scadenza" htmlFor={`${panelId}-due`}>
                <input
                  id={`${panelId}-due`}
                  type="date"
                  required
                  defaultValue={d.dueDate}
                  onChange={(e) => isValidISO(e.target.value) && save({ dueDate: e.target.value })}
                  className={inputClass}
                />
              </Field>
              {status === "done" && (
                <Field label="Consegnata il" htmlFor={`${panelId}-done`}>
                  <input
                    id={`${panelId}-done`}
                    type="date"
                    defaultValue={d.doneOn ?? today}
                    onChange={(e) => isValidISO(e.target.value) && save({ doneOn: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              )}
            </div>

            {d.contractNote && (
              <p className="max-w-[70ch] text-sm leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">Dal contratto. </span>
                {d.contractNote}
              </p>
            )}

            <ErrorText>{error}</ErrorText>
            {pending && (
              <p className="sr-only" role="status">
                Salvataggio
              </p>
            )}

            <RowTools d={d} />
          </div>
        </div>
      </div>
    </li>
  );
}

function StatusControl({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <span id={id} className={labelClass}>
        Stato
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="grid grid-cols-2 gap-px border border-ink/70 bg-ink/70 sm:inline-grid sm:w-max sm:grid-cols-4"
      >
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => status !== s && onChange(s)}
            className={cn(
              "flex h-9 items-center justify-center gap-2 px-3.5 text-sm transition-colors",
              status === s ? "bg-ink font-semibold text-sheet" : "bg-paper text-ink hover:bg-wash",
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Blockers({
  id,
  d,
  today,
  parties,
  formOpen,
  onClose,
}: {
  id: string;
  d: Deliverable;
  today: string;
  parties: string[];
  formOpen: boolean;
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  const [party, setParty] = useState("");
  const [reason, setReason] = useState("");
  const [openedOn, setOpenedOn] = useState(today);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(
      () => openBlocker(d.id, { party, reason, openedOn }),
      () => {
        setParty("");
        setReason("");
        setOpenedOn(today);
        onClose();
      },
    );
  };

  return (
    <div id={id} className="grid gap-3 border border-rule bg-sheet/70 p-4">
      <div>
        <h4 className="text-sm font-semibold">Dipendenze esterne</h4>
        <p className="mt-0.5 text-xs text-ink-3">
          Chi stai aspettando per andare avanti. I giorni si contano da soli finché non segni l&rsquo;attesa come risolta.
        </p>
      </div>

      {d.blockers.length > 0 && (
        <ul className="grid gap-px border border-rule bg-rule">
          {d.blockers.map((b) => (
            <BlockerLine key={b.id} b={b} today={today} />
          ))}
        </ul>
      )}

      {formOpen && (
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_9.5rem]">
            <Field label="In attesa di" htmlFor={`${id}-party`}>
              <input
                id={`${id}-party`}
                list={`${id}-parties`}
                value={party}
                required
                autoFocus
                onChange={(e) => setParty(e.target.value)}
                className={inputClass}
              />
              <datalist id={`${id}-parties`}>
                {parties.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field label="Cosa manca" htmlFor={`${id}-reason`}>
              <input
                id={`${id}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Feedback, contenuti, accessi, approvazione"
                className={inputClass}
              />
            </Field>
            <Field label="Dal" htmlFor={`${id}-since`}>
              <input
                id={`${id}-since`}
                type="date"
                required
                value={openedOn}
                onChange={(e) => setOpenedOn(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" disabled={pending || !party.trim()}>
              Salva attesa
            </Button>
            <Button variant="quiet" onClick={onClose}>
              Annulla
            </Button>
          </div>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function BlockerLine({ b, today }: { b: Blocker; today: string }) {
  const { pending, error, run } = useAction();
  const days = blockerDays(b, today);

  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 bg-sheet px-3 py-2.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
      <Hatch soft={Boolean(b.resolvedOn)} className="mt-0.5 h-4 w-6" />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{b.party}</span>
          {b.reason && <span className="text-ink-2">: {b.reason}</span>}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-ink-3">
          {b.resolvedOn
            ? `Dal ${fmtDay(b.openedOn)} al ${fmtDay(b.resolvedOn)}, ${plural(days, "giorno", "giorni")}`
            : `Dal ${fmtDay(b.openedOn)}, ${days === 0 ? "aperta oggi" : `${plural(days, "giorno", "giorni")} finora`}`}
        </p>
        <ErrorText>{error}</ErrorText>
      </div>
      <div className="col-start-2 mt-2 flex items-center gap-4 sm:col-start-3 sm:mt-0">
        {b.resolvedOn ? (
          <Button variant="quiet" size="sm" disabled={pending} onClick={() => run(() => reopenBlocker(b.id))}>
            Riapri
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => run(() => resolveBlocker(b.id, today))}>
            Risolta oggi
          </Button>
        )}
        <Button variant="quiet" size="sm" disabled={pending} onClick={() => run(() => deleteBlocker(b.id))}>
          Elimina
        </Button>
      </div>
    </li>
  );
}

function Notes({ d, today }: { d: Deliverable; today: string }) {
  const id = useId();
  const { pending, error, run } = useAction();
  const [body, setBody] = useState("");
  const [date, setDate] = useState(today);
  const [shared, setShared] = useState(false);

  const submit = () => {
    if (!body.trim()) return;
    run(
      () => addNote(d.id, { date, body, shared }),
      () => {
        setBody("");
        setDate(today);
        setShared(false);
      },
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold">Note</h4>
        <span className="text-xs text-ink-3">
          Private, tranne quelle segnate &ldquo;Visibile al cliente&rdquo; (vista cliente e PDF).
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-end"
      >
        <Field label="Data" htmlFor={`${id}-date`}>
          <input
            id={`${id}-date`}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Nuova nota" htmlFor={`${id}-body`}>
          <textarea
            id={`${id}-body`}
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Decisioni, invii, feedback ricevuti"
            className={cn(inputClass, "h-auto min-h-9 py-2 leading-relaxed")}
          />
        </Field>
        <Button type="submit" disabled={pending || !body.trim()}>
          Aggiungi nota
        </Button>
        <label className="flex w-max items-center gap-2 text-sm text-ink-2 sm:col-start-2">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="size-4 accent-ink"
          />
          Visibile al cliente (anche nel PDF)
        </label>
      </form>
      <ErrorText>{error}</ErrorText>
      {d.notes.length > 0 && (
        <ol className="divide-y divide-rule border-y border-rule">
          {d.notes.map((n) => (
            <NoteLine key={n.id} note={n} />
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteLine({ note }: { note: Note }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [shared, setOptimisticShared] = useOptimistic(note.shared);
  const { pending, error, run } = useAction();

  return (
    <li className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-3 py-2.5">
      <span className="text-sm tabular-nums text-ink-2">{fmtDay(note.date)}</span>
      <div className="min-w-0">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body = String(new FormData(e.currentTarget).get("body") ?? "");
              run(() => updateNote(note.id, body), () => setEditing(false));
            }}
            className="grid gap-2"
          >
            <label htmlFor={id} className="sr-only">
              Testo della nota
            </label>
            <textarea
              id={id}
              name="body"
              rows={3}
              defaultValue={note.body}
              autoFocus
              className={cn(inputClass, "h-auto py-2 leading-relaxed")}
            />
            <div className="flex items-center gap-4">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                Salva
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>
                Annulla
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="whitespace-pre-line text-sm leading-relaxed">{note.body}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                <input
                  type="checkbox"
                  checked={shared}
                  disabled={pending}
                  onChange={(e) => {
                    const next = e.target.checked;
                    run(async () => {
                      setOptimisticShared(next);
                      return setNoteShared(note.id, next);
                    });
                  }}
                  className="size-3.5 accent-ink"
                />
                Visibile al cliente
              </label>
              <Button variant="quiet" size="sm" onClick={() => setEditing(true)}>
                Modifica
              </Button>
              <Button variant="quiet" size="sm" disabled={pending} onClick={() => run(() => deleteNote(note.id))}>
                Elimina
              </Button>
            </div>
          </>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </li>
  );
}

function RowTools({ d }: { d: Deliverable }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useAction();

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          run(
            () =>
              updateDeliverable(d.id, {
                title: String(form.get("title") ?? ""),
                contents: String(form.get("contents") ?? ""),
              }),
            () => setEditing(false),
          );
        }}
        className="grid gap-3 border-t border-rule pt-5"
      >
        <Field label="Titolo" htmlFor={`${id}-title`}>
          <input id={`${id}-title`} name="title" required defaultValue={d.title} className={inputClass} />
        </Field>
        <Field label="Contenuto" htmlFor={`${id}-contents`}>
          <textarea
            id={`${id}-contents`}
            name="contents"
            rows={2}
            defaultValue={d.contents}
            className={cn(inputClass, "h-auto py-2 leading-relaxed")}
          />
        </Field>
        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            Salva testo
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-4">
      <Button variant="quiet" size="sm" onClick={() => setEditing(true)}>
        Modifica titolo e contenuto
      </Button>
      {confirming ? (
        <>
          <Button variant="alert" size="sm" disabled={pending} onClick={() => run(() => deleteDeliverable(d.id))}>
            Conferma: elimina consegna e attese
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
            Annulla
          </Button>
        </>
      ) : (
        <Button variant="quiet" size="sm" onClick={() => setConfirming(true)}>
          Elimina
        </Button>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
