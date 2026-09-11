import { Button, inputClass } from "@/components/ui";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const failed = (await searchParams).errore === "1";

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <form action={login} className="rise w-full max-w-sm">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink-2">Loquis</p>
        <h1 className="mt-1 font-display text-5xl font-bold leading-[0.95] tracking-tight">Registro di avanzamento</h1>
        <div className="mt-10 grid gap-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-ink-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={failed || undefined}
            aria-describedby={failed ? "password-error" : undefined}
            className={inputClass}
          />
          {failed && (
            <p id="password-error" className="text-xs font-medium text-signal">
              Password non corretta.
            </p>
          )}
        </div>
        <Button type="submit" variant="primary" className="mt-5 w-full">
          Entra
        </Button>
      </form>
    </main>
  );
}
