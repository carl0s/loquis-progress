import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BandiHours } from "@/components/BandiHours";
import { ClientLedger, ProgressSummary } from "@/components/ClientLedger";
import { PlatformsLog } from "@/components/PlatformsLog";
import { PrintButton } from "@/components/PrintButton";
import { Timeline } from "@/components/Timeline";
import { SectionTitle } from "@/components/ui";
import { Upcoming } from "@/components/Upcoming";
import { WaitingPanel, type WaitingRow } from "@/components/WaitingPanel";
import { authEnabled, currentRole } from "@/lib/auth";
import { getHours, getLog, getProjects, getSetting } from "@/lib/data";
import { fmtLong, fmtStamp, todayISO } from "@/lib/dates";
import { blockerDays, blockerRows, contractMonths, upcoming } from "@/lib/derive";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

// The title doubles as the suggested PDF file name.
export async function generateMetadata(): Promise<Metadata> {
  return { title: `Loquis stato di avanzamento ${todayISO()}` };
}

// Read-only view for the client. No notes, no calendar, no forms, no export.
export default async function ClientView() {
  const today = todayISO();
  const [allProjects, log, hours, lastChange, role] = await Promise.all([
    getProjects(),
    getLog(),
    getHours(),
    getSetting("last_change"),
    currentRole(),
  ]);

  // Only notes explicitly marked "Visibile al cliente" leave the owner's view.
  const projects = allProjects.map((p) => ({
    ...p,
    deliverables: p.deliverables.map((d) => ({ ...d, notes: d.notes.filter((n) => n.shared) })),
  }));

  const dated = projects.filter((p) => !p.ongoing);
  const ongoing = projects.find((p) => p.ongoing);
  const waitingRows: WaitingRow[] = blockerRows(projects).map(({ p, d, b }) => ({
    ...b,
    code: p.code,
    deliverableTitle: d.title,
  }));
  const openWaiting = waitingRows.filter((r) => !r.resolvedOn);

  return (
    <main className="mx-auto max-w-[88rem] px-5 pb-28 pt-8 sm:px-8 lg:px-12">
      <header className="rise flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b-2 border-ink pb-5">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink-2">Loquis</p>
          <h1 className="mt-1 font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-6xl">
            Stato di avanzamento
          </h1>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold leading-none first-letter:uppercase">{fmtLong(today)}</p>
          <p className="mt-1.5 text-xs text-ink-3">
            {lastChange ? `Aggiornato il ${fmtStamp(lastChange)}` : "Sola lettura"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3 sm:justify-end print:hidden">
            <PrintButton />
            {role === "owner" && (
              <Link href="/" className="underline decoration-rule-strong underline-offset-4 hover:text-ink">
                Torna al registro
              </Link>
            )}
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
            <Upcoming items={upcoming(projects, today)} today={today} readOnly />
          </div>
        </section>
        <ProgressSummary
          projects={dated}
          openWaiting={openWaiting.length}
          waitingDays={openWaiting.reduce((sum, r) => sum + blockerDays(r, today), 0)}
        />
      </div>

      <section aria-labelledby="timeline-title" className="rise mt-16" style={{ "--i": 2 } as CSSProperties}>
        <SectionTitle id="timeline-title">Calendario lavori</SectionTitle>
        <div className="mt-6">
          <Timeline projects={projects} events={[]} today={today} showAgenda={false} />
        </div>
      </section>

      <div className="mt-20 grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="consegne-title">
          <SectionTitle id="consegne-title">Consegne</SectionTitle>
          <div className="mt-6 grid gap-14">
            {dated.map((p) => (
              <ClientLedger key={p.id} project={p} today={today} />
            ))}
          </div>
        </section>
        <aside className="grid content-start gap-16">
          <WaitingPanel rows={waitingRows} today={today} readOnly />
        </aside>
      </div>

      <div className="mt-24 grid gap-x-16 gap-y-16 border-t-2 border-ink pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {ongoing && (
          <PlatformsLog
            project={{ name: ongoing.name, objective: ongoing.objective, criteria: ongoing.criteria }}
            entries={log}
            months={contractMonths(projects, today)}
            today={today}
            readOnly
          />
        )}
        <BandiHours entries={hours} today={today} readOnly />
      </div>
    </main>
  );
}
