import {
  ChartNoAxesCombined,
  House,
  LayoutDashboard,
  Table2,
} from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { BrandLink } from "@/components/BrandLink";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { useTheme } from "@/components/theme/theme";
import { useWorkspaceDataset } from "./useWorkspaceDataset";

const navLinkClass =
  "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center text-xs leading-tight text-muted-foreground outline-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground md:min-h-9 md:flex-row md:justify-start md:gap-2.5 md:px-2.5 md:text-left md:text-sm";

const links = [
  { to: "/workspace", label: "Overview", icon: House, end: true },
  { to: "datasets", label: "Data Explorer", shortLabel: "Data", icon: Table2 },
  { to: "charts", label: "Charts", icon: ChartNoAxesCombined },
  { to: "dashboards", label: "Dashboards", icon: LayoutDashboard },
];

export function WorkspaceLayout() {
  const dataset = useWorkspaceDataset();
  const { resolvedTheme } = useTheme();
  const logoInk = resolvedTheme === "dark" ? "white" : "black";

  return (
    <div className="flex min-h-dvh flex-col gap-2 p-2 md:flex-row md:gap-3 md:p-3">
      <aside className="px-1 text-sidebar-foreground md:sticky md:top-3 md:max-h-[calc(100dvh-1.5rem)] md:w-48 md:shrink-0 md:self-start md:overflow-y-auto md:px-2 lg:w-52">
        <div className="flex items-center justify-between gap-2 px-1">
          <BrandLink compact />
          <ThemeSwitcher />
        </div>
        <nav
          aria-label="Workspace"
          className="mt-2 grid grid-cols-4 gap-1 md:mt-5 md:grid-cols-1"
        >
          {links.map(({ to, label, shortLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={navLinkClass}
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.75}
                className="size-4 shrink-0"
              />
              {shortLabel && <span className="md:hidden">{shortLabel}</span>}
              <span className={shortLabel ? "hidden md:inline" : undefined}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col rounded-xl border border-panel-border bg-workspace">
        {dataset.error && (
          <p
            role="alert"
            className="wrap-break-word border-b border-panel-border px-4 py-3 text-sm text-destructive sm:px-6"
          >
            {dataset.error}
          </p>
        )}
        {dataset.storageWarning && (
          <p
            role="status"
            className="wrap-break-word border-b border-panel-border px-4 py-3 text-sm text-muted-foreground sm:px-6"
          >
            {dataset.storageWarning}
          </p>
        )}
        {dataset.isRestoring ? (
          <div className="grid min-h-52 flex-1 place-items-center px-6 py-8">
            <div
              role="status"
              className="grid justify-items-center gap-4 text-center text-sm text-muted-foreground"
            >
              <img
                src={`/brand/ask2chart-mark-${logoInk}.svg`}
                alt=""
                width={36}
                height={36}
                className="opacity-40"
              />
              <p>{dataset.loadingMessage}</p>
            </div>
          </div>
        ) : (
          <Outlet context={dataset} />
        )}
      </main>
    </div>
  );
}
