import type { CSSProperties } from "react";
import { AgendaPanel } from "@/components/AgendaPanel";
import { Attention } from "@/components/Attention";
import { BandiHours } from "@/components/BandiHours";
import { PlatformsLog } from "@/components/PlatformsLog";
import { ProjectLedger } from "@/components/ProjectLedger";
import { Timeline } from "@/components/Timeline";
import { SectionTitle } from "@/components/ui";
import { Upcoming } from "@/components/Upcoming";
import { WaitingPanel, type WaitingRow } from "@/components/WaitingPanel";
import { buildAgenda } from "@/lib/agenda";
import { authEnabled } from "@/lib/auth";
import { loadCalendar } from "@/lib/calendar";
import { getEventLinks, getHours, getLog, getProjects, getSetting } from "@/lib/data";
import Link from "next/link";
import { addDays, firstOfMonth, fmtLong, fmtStamp, todayISO } from "@/lib/dates";
import { blockerDays, blockerRows, contractMonths, overdue, upcoming } from "@/lib/derive";
import type { AgendaItem, CalendarState } from "@/lib/types";
import { logout } from "./login/actions";

export const dynamic = "force-dynamic";

const DEFAULT_PARTIES = ["Bitage", "Team Loquis", "Stakeholder Loquis"];

function urlHint(url: string) {
  try {
    const u = new URL(url);
    return `${u.host}/...${u.pathname.slice(-12)}`;
  } catch {
    return "indirizzo salvato";
  }
}

export default async function Home() {
  const today = todayISO();
  const [projects, log, hours, links, storedUrl, lastChange] = await Promise.all([
    getProjects(),
    getLog(),
    getHours(),
    getEventLinks(),
    getSetting("ics_url"),
    getSetting("last_change"),
  ]);

  const dated = projects.filter((p) => !p.ongoing);
  const ongoing = projects.find((p) => p.ongoing);
  const dates = [today, ...dated.flatMap((p) => p.deliverables.flatMap((d) => [d.startDate ?? d.dueDate, d.dueDate]))];
  const first = dates.reduce((a, b) => (a < b ? a : b));
  const last = dates.reduce((a, b) => (a > b ? a : b));

  // Calendar: from the start of the timeline to 30 days ahead (or the last deadline, if later).
  const icsUrl = storedUrl ?? process.env.LOQUIS_ICS_URL ?? null;
  let calendar: CalendarState = { status: "missing" };
  let agenda: AgendaItem[] = [];
  if (icsUrl) {
    const to = [addDays(today, 30), addDays(last, 12)].reduce((a, b) => (a > b ? a : b));
    const result = await loadCalendar(icsUrl, { from: firstOfMonth(addDays(first, -3)), to });
    if (result.ok) {
      agenda = buildAgenda(result.events, projects, links);
      calendar = { status: "ok", fetchedAt: result.fetchedAt, urlHint: urlHint(icsUrl), count: result.events.length };
    } else {
      calendar = { status: "error", message: result.message, urlHint: urlHint(icsUrl) };
    }
  }
  const nextMonthEvents = agenda.filter((i) => i.date >= today && i.date <= addDays(today, 30));

  const late = overdue(projects, today).map(({ p, d }) => ({ id: d.id, code: p.code, title: d.title, dueDate: d.dueDate }));
  const waitingRows: WaitingRow[] = blockerRows(projects).map(({ p, d, b }) => ({
    ...b,
    code: p.code,
    deliverableTitle: d.title,
  }));
  const openWaiting = waitingRows.filter((r) => !r.resolvedOn);
  const parties = [...new Set([...DEFAULT_PARTIES, ...waitingRows.map((r) => r.party)])];

  const months = contractMonths(projects, today);

  return (
    <main className="mx-auto max-w-[88rem] px-5 pb-28 pt-8 sm:px-8 lg:px-12">
      <header className="rise flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b-2 border-ink pb-5">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink-2">Loquis</p>
          <h1 className="mt-1 font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-6xl">
            Registro di avanzamento
          </h1>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold leading-none first-letter:uppercase">{fmtLong(today)}</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 text-xs text-ink-3 sm:justify-end">
            <span>{lastChange ? `Ultima modifica ${fmtStamp(lastChange)}` : "Nessuna modifica registrata"}</span>
            <Link href="/cliente" className="underline decoration-rule-strong underline-offset-4 hover:text-ink">
              Vista cliente
            </Link>
            {authEnabled() && (
              <form action={logout}>
                <button type="submit" className="underline decoration-rule-strong underline-offset-4 hover:text-ink">
                  Esci
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <div
        className="rise mt-10 grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
        style={{ "--i": 1 } as CSSProperties}
      >
        <section aria-labelledby="upcoming-title">
          <SectionTitle id="upcoming-title">In arrivo</SectionTitle>
          <div className="mt-4">
            <Upcoming items={upcoming(projects, today)} today={today} />
          </div>
        </section>
        <Attention
          late={late}
          waiting={{ count: openWaiting.length, days: openWaiting.reduce((sum, r) => sum + blockerDays(r, today), 0) }}
          today={today}
        />
      </div>

      <section aria-labelledby="timeline-title" className="rise mt-16" style={{ "--i": 2 } as CSSProperties}>
        <SectionTitle id="timeline-title">Calendario lavori</SectionTitle>
        <div className="mt-6">
          <Timeline projects={projects} events={agenda} today={today} />
        </div>
      </section>

      <div className="mt-20 grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="consegne-title">
          <SectionTitle id="consegne-title">Consegne</SectionTitle>
          <div className="mt-6 grid gap-14">
            {dated.map((p) => (
              <ProjectLedger key={p.id} project={p} today={today} parties={parties} />
            ))}
          </div>
        </section>
        <aside className="grid content-start gap-16">
          <WaitingPanel rows={waitingRows} today={today} />
          <AgendaPanel
            state={calendar}
            items={nextMonthEvents}
            projects={projects.map(({ id, code, name }) => ({ id, code, name }))}
            today={today}
          />
        </aside>
      </div>

      <div className="mt-24 grid gap-x-16 gap-y-16 border-t-2 border-ink pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {ongoing && (
          <PlatformsLog
            project={{ name: ongoing.name, objective: ongoing.objective, criteria: ongoing.criteria }}
            entries={log}
            months={months}
            today={today}
          />
        )}
        <BandiHours entries={hours} today={today} />
      </div>
    </main>
  );
}
