import {
  Link,
  useLocation,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceEmptyState } from "@/features/workspace/WorkspaceEmptyState";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
import { sampleDatasetId } from "@/lib/workspaceDb";
import type { WorkspaceDataset } from "@/types/dataset";
import { maxQuestionLength } from "./analysisApiSchema";
import { DatasetAnalysis } from "./DatasetAnalysis";

export function ChartsPage() {
  const { engine, dataset, loadingMessage, openSample } =
    useOutletContext<WorkspaceDataset>();
  const [searchParams] = useSearchParams();
  const state = useLocation().state as {
    datasetId?: unknown;
    draft?: unknown;
  } | null;
  const initialView = searchParams.get("view");
  const initialDraft =
    initialView === "assistant" &&
    state?.datasetId === dataset?.id &&
    typeof state?.draft === "string"
      ? state.draft.slice(0, maxQuestionLength)
      : undefined;
  const analysisId = Number(searchParams.get("analysis"));
  const initialAnalysisId =
    Number.isSafeInteger(analysisId) && analysisId > 0 ? analysisId : null;

  return (
    <WorkspacePage
      title="Chart Studio"
      actions={
        dataset &&
        dataset.id !== sampleDatasetId && (
          <Button
            variant="outline"
            disabled={Boolean(loadingMessage)}
            onClick={openSample}
          >
            Try sample data
          </Button>
        )
      }
    >
      {loadingMessage && (
        <p
          role="status"
          className="wrap-break-word text-sm text-muted-foreground"
        >
          {loadingMessage}
        </p>
      )}
      {!loadingMessage &&
        (dataset ? (
          <DatasetAnalysis
            key={`${dataset.id}:${initialView ?? ""}:${initialAnalysisId ?? ""}`}
            dataset={dataset}
            engine={engine}
            initialView={initialView}
            initialDraft={initialDraft}
            initialAnalysisId={initialAnalysisId}
          />
        ) : (
          <WorkspaceEmptyState
            icon={ChartNoAxesCombined}
            title="Choose a dataset to get started"
            description="Try the sample sales data or open a CSV in Data Explorer to build your first chart."
          >
            <Button onClick={openSample}>Try sample data</Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="../datasets" />}
            >
              Open Data Explorer
            </Button>
          </WorkspaceEmptyState>
        ))}
    </WorkspacePage>
  );
}
