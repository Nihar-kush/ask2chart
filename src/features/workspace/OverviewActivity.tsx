import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  ChartColumn,
  ChartLine,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  analysisDateFormat,
  useRecentAnalyses,
} from "@/features/charts/useRecentAnalyses";
import { workspaceDb } from "@/lib/workspaceDb";

const chartKinds = {
  bar: { label: "Bar chart", icon: ChartColumn },
  line: { label: "Line chart", icon: ChartLine },
};

export function OverviewRecentAnalyses({ datasetId }: { datasetId: string }) {
  const analyses = useRecentAnalyses(datasetId, 5);

  return (
    <section
      aria-labelledby="overview-recent-analyses"
      className="grid min-w-0 content-start gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="overview-recent-analyses" className="font-semibold">
          Recent analyses
        </h2>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to="charts?view=history" />}
        >
          View history
        </Button>
      </div>
      {analyses === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading recent analyses…
        </p>
      ) : analyses === null ? (
        <p role="alert" className="text-sm text-destructive">
          Could not read recent analyses.
        </p>
      ) : analyses.length === 0 ? (
        <p className="border-t pt-3 text-sm text-muted-foreground">
          Run an analysis in Chart Studio to see it here.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {analyses.map((analysis) => {
            const kind = chartKinds[analysis.plan.chart];
            const runDate = analysisDateFormat.format(analysis.createdAt);
            return (
              <li key={analysis.id}>
                <ActivityLink
                  to={`charts?analysis=${analysis.id}`}
                  title={analysis.title}
                  icon={kind.icon}
                  action="Run again"
                  label={`Run again ${analysis.title}, ${kind.label}, ${runDate}`}
                  details={
                    <>
                      <span>{kind.label}</span>
                      <span aria-hidden="true">·</span>
                      <time
                        dateTime={new Date(analysis.createdAt).toISOString()}
                      >
                        {runDate}
                      </time>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function OverviewSavedWork({
  hideWhenEmpty = false,
}: {
  hideWhenEmpty?: boolean;
}) {
  const saved = useLiveQuery(() =>
    workspaceDb
      .transaction(
        "r",
        workspaceDb.dashboardCharts,
        workspaceDb.dashboards,
        async () => {
          const [charts, dashboards] = await Promise.all([
            workspaceDb.dashboardCharts
              .orderBy("createdAt")
              .reverse()
              .limit(3)
              .toArray(),
            workspaceDb.dashboards
              .orderBy("createdAt")
              .reverse()
              .limit(3)
              .toArray(),
          ]);
          const owners = await workspaceDb.dashboards.bulkGet(
            charts.map(({ dashboardId }) => dashboardId),
          );
          return {
            dashboards,
            charts: charts.flatMap((chart, index) => {
              const dashboard = owners[index];
              return dashboard ? [{ chart, dashboard }] : [];
            }),
          };
        },
      )
      .catch(() => null),
  );
  const hasSaved = Boolean(saved?.charts.length || saved?.dashboards.length);
  if (hideWhenEmpty && !hasSaved) return null;

  return (
    <section
      aria-labelledby="overview-saved-work"
      className="grid min-w-0 content-start gap-3"
    >
      <h2 id="overview-saved-work" className="font-semibold">
        Saved work
      </h2>
      {saved === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading saved work…
        </p>
      ) : saved === null ? (
        <p role="alert" className="text-sm text-destructive">
          Could not read saved work.
        </p>
      ) : !hasSaved ? (
        <p className="border-t pt-3 text-sm text-muted-foreground">
          Pin a chart or create a dashboard to see it here.
        </p>
      ) : (
        <div className="grid gap-4 border-t pt-3">
          {saved.charts.length > 0 && (
            <div className="grid gap-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                Pinned charts
              </h3>
              <ul className="divide-y">
                {saved.charts.map(({ chart, dashboard }) => (
                  <li key={chart.id}>
                    <ActivityLink
                      to={`dashboards?${new URLSearchParams({ dashboard: dashboard.id, chart: chart.id })}`}
                      title={chart.title}
                      icon={chartKinds[chart.plan.chart].icon}
                      details={dashboard.title}
                      label={`Open ${chart.title} on ${dashboard.title}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {saved.dashboards.length > 0 && (
            <div className="grid gap-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                Dashboards
              </h3>
              <ul className="divide-y">
                {saved.dashboards.map((dashboard) => (
                  <li key={dashboard.id}>
                    <ActivityLink
                      to={`dashboards?${new URLSearchParams({ dashboard: dashboard.id })}`}
                      title={dashboard.title}
                      icon={LayoutDashboard}
                      label={`Open dashboard ${dashboard.title}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ActivityLink({
  to,
  title,
  icon: Icon,
  details,
  label,
  action,
}: {
  to: string;
  title: string;
  icon: LucideIcon;
  details?: ReactNode;
  label: string;
  action?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex min-h-12 min-w-0 items-center gap-3 px-2 py-2.5 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <Icon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="wrap-break-word text-sm font-medium">{title}</p>
        {details && (
          <div className="flex min-w-0 flex-wrap gap-x-1.5 wrap-break-word text-xs text-muted-foreground">
            {details}
          </div>
        )}
      </div>
      {action && (
        <span
          aria-hidden="true"
          className="whitespace-nowrap text-xs text-muted-foreground"
        >
          {action}
        </span>
      )}
      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
