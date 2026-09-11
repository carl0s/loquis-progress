import type { ButtonHTMLAttributes, ReactNode } from "react";

// Shape system: square corners everywhere, 1px rules, no shadows.

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const variants = {
  primary: "border border-ink bg-ink text-sheet hover:border-ink-2 hover:bg-ink-2",
  secondary: "border border-ink/70 text-ink hover:bg-wash",
  quiet: "text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ink",
  alert: "font-semibold text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal",
} as const;

const sizes = { md: "text-sm", sm: "text-xs" } as const;
const boxes = { md: "h-9 px-3.5", sm: "h-7 px-2.5" } as const;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        (variant === "primary" || variant === "secondary") && boxes[size],
        className,
      )}
      {...props}
    />
  );
}

export const inputClass =
  "h-9 w-full min-w-0 border border-rule-strong bg-sheet px-2.5 text-sm text-ink placeholder:text-ink-3 hover:border-ink-3 focus:border-ink";

export const labelClass = "text-xs font-semibold text-ink-2";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs font-medium text-signal">
      {children}
    </p>
  );
}

export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 id={id} className="font-display text-[2rem] font-bold leading-none tracking-tight">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** Small hatched swatch: the one visual for "waiting on someone else". */
export function Hatch({ soft, className }: { soft?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 border", soft ? "hatch-soft border-rule-strong" : "hatch border-ink/40", className)}
    />
  );
}
