import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="grid min-h-64 flex-1 place-items-center py-10 sm:py-16"
    >
      <div className="grid w-full max-w-sm justify-items-start gap-4">
        <span className="grid size-11 place-items-center rounded-xl border border-panel-border bg-card text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.65} />
        </span>
        <div className="grid gap-1.5">
          <h2 id={titleId} className="text-base font-medium">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </section>
  );
}
