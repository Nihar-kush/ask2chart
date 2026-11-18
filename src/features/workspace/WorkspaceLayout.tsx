import { Link, NavLink, Outlet } from "react-router";
import { useWorkspaceDataset } from "./useWorkspaceDataset";

const navLinkClass =
  "rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:bg-muted aria-[current=page]:font-medium";

export function WorkspaceLayout() {
  const dataset = useWorkspaceDataset();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="border-b px-4 py-5 md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <Link to="/" className="inline-block px-3 font-semibold tracking-tight">
          Ask2Chart
        </Link>
        <nav
          aria-label="Workspace"
          className="mt-4 flex flex-wrap gap-1 md:flex-col"
        >
          <NavLink to="/workspace" end className={navLinkClass}>
            Overview
          </NavLink>
          <NavLink to="datasets" className={navLinkClass}>
            Data Explorer
          </NavLink>
          <NavLink to="charts" className={navLinkClass}>
            Charts
          </NavLink>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-8 md:px-8">
        {dataset.error && (
          <p
            role="alert"
            className="mb-4 wrap-break-word text-sm text-destructive"
          >
            {dataset.error}
          </p>
        )}
        {dataset.storageWarning && (
          <p
            role="status"
            className="mb-4 wrap-break-word text-sm text-muted-foreground"
          >
            {dataset.storageWarning}
          </p>
        )}
        <Outlet context={dataset} />
      </main>
    </div>
  );
}
