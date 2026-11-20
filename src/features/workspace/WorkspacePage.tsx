import type { ReactNode } from "react";

export function WorkspacePage({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-13 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-panel-border px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-sm font-medium">{title}</h1>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  );
}
