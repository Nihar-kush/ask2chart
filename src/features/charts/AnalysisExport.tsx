import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/types/analysis";
import { downloadResultCsv } from "./chartExport";

const itemClass =
  "flex min-h-9 items-center rounded-md px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50";

export function AnalysisExport({
  title,
  result,
  exportPng,
}: {
  title: string;
  result: AnalysisResult;
  exportPng: (() => Promise<void>) | null;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "png" | "csv") {
    setError(null);
    setExporting(true);
    try {
      if (format === "png") {
        if (exportPng) await exportPng();
      } else {
        downloadResultCsv(title, result);
      }
    } catch {
      setError(`Could not export the ${format.toUpperCase()}. Try again.`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Menu.Root>
        <Menu.Trigger
          render={<Button variant="outline" />}
          disabled={exporting}
        >
          <Download aria-hidden="true" />
          {exporting ? "Exporting…" : "Export"}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={5} align="end" className="z-30">
            <Menu.Popup className="min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
              <Menu.Item
                className={itemClass}
                disabled={!exportPng}
                onClick={() => void download("png")}
              >
                Download PNG
              </Menu.Item>
              <Menu.Item
                className={itemClass}
                onClick={() => void download("csv")}
              >
                Download CSV
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
