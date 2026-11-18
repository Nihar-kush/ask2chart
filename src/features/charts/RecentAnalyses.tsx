import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { analysisHistory, workspaceDb } from "@/lib/workspaceDb";
import type { SavedAnalysis } from "@/types/analysis";

const pageSize = 10;

const runDateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function RecentAnalyses({
  datasetId,
  disabled,
  onRun,
}: {
  datasetId: string;
  disabled: boolean;
  onRun: (analysis: SavedAnalysis) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removalError, setRemovalError] = useState(false);
  const [removalMessage, setRemovalMessage] = useState("");
  const analyses = useLiveQuery(
    () =>
      analysisHistory(datasetId)
        .reverse()
        .limit(visibleCount + 1)
        .toArray()
        .catch(() => null),
    [datasetId, visibleCount],
  );

  async function removeAnalysis({ id, title }: SavedAnalysis) {
    if (removingId !== null) return;

    setRemovingId(id);
    setRemovalError(false);
    setRemovalMessage("");
    try {
      await workspaceDb.analyses.delete(id);
      setRemovalMessage(`Removed ${title} from recent analyses.`);
    } catch {
      setRemovalError(true);
    } finally {
      setRemovingId(null);
    }
  }

  async function clearHistory() {
    await analysisHistory(datasetId).delete();
    setVisibleCount(pageSize);
    setRemovalError(false);
    setRemovalMessage("Analysis history cleared.");
  }

  return (
    <section
      aria-label="Recent analyses"
      className="grid gap-2 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>
          <Button
            variant="ghost"
            className="font-semibold"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((expanded) => !expanded)}
          >
            Recent analyses
            <ChevronDown
              aria-hidden="true"
              className={open ? "" : "-rotate-90"}
            />
          </Button>
        </h2>
        {open && Boolean(analyses?.length) && (
          <ConfirmAction
            action="Clear history"
            title="Clear analysis history?"
            description="This removes all saved analyses for this dataset from this browser, including older runs."
            disabled={disabled || removingId !== null}
            onConfirm={clearHistory}
          />
        )}
      </div>
      <p role="status" className="sr-only">
        {removalMessage}
      </p>
      <div id={panelId} className={open ? "grid gap-2" : "hidden"}>
        {removalError && (
          <p role="alert" className="text-sm text-destructive">
            Could not remove the analysis. Try again.
          </p>
        )}
        {analyses === undefined ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading recent analyses…
          </p>
        ) : analyses === null ? (
          <p role="alert" className="text-sm text-destructive">
            Could not read recent analyses.
          </p>
        ) : analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Completed analyses for this dataset appear here.
          </p>
        ) : (
          <ul className="divide-y">
            {analyses.slice(0, visibleCount).map((analysis) => {
              const runDate = runDateFormat.format(analysis.createdAt);
              const isRemoving = removingId === analysis.id;

              return (
                <li
                  key={analysis.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="wrap-break-word text-sm font-medium">
                      {analysis.title}
                    </p>
                    {analysis.question && (
                      <p className="wrap-break-word text-sm text-muted-foreground">
                        {analysis.question}
                      </p>
                    )}
                    <time
                      dateTime={new Date(analysis.createdAt).toISOString()}
                      className="text-xs text-muted-foreground"
                    >
                      {runDate}
                    </time>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={disabled || isRemoving}
                      onClick={() => onRun(analysis)}
                    >
                      Run again{" "}
                      <span className="sr-only">{analysis.title}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={disabled || removingId !== null}
                      aria-label={`Remove ${analysis.title}, ${runDate}`}
                      onClick={() => void removeAnalysis(analysis)}
                    >
                      {isRemoving ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {analyses && analyses.length > visibleCount && (
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => setVisibleCount((count) => count + pageSize)}
          >
            Show more
          </Button>
        )}
      </div>
    </section>
  );
}
