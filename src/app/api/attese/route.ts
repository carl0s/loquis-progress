import { isOwner } from "@/lib/auth";
import { getProjects } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { blockerDays, blockerRows } from "@/lib/derive";

export const dynamic = "force-dynamic";

const cell = (value: string) => (/[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// Semicolon-separated with a BOM so Excel (Italian locale) opens it correctly.
export async function GET() {
  if (!(await isOwner())) return new Response("Non autorizzato", { status: 401 });
  const today = todayISO();
  const rows = [["Progetto", "Consegna", "In attesa di", "Cosa manca", "Dal", "Al", "Giorni", "Stato"]];
  for (const { p, d, b } of blockerRows(await getProjects())) {
    rows.push([
      `${p.code} ${p.name}`,
      d.title,
      b.party,
      b.reason,
      b.openedOn,
      b.resolvedOn ?? "",
      String(blockerDays(b, today)),
      b.resolvedOn ? "risolta" : "aperta",
    ]);
  }
  const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attese-esterne-${today}.csv"`,
    },
  });
}
