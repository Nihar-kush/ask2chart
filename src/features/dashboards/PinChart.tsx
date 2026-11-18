import { useId, useState, type SubmitEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import { Pin } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/SelectField";
import { workspaceDb } from "@/lib/workspaceDb";
import type { DashboardChart } from "@/types/dashboard";
import { pinChart } from "./dashboardStorage";

export function PinChart({
  chart,
  disabled,
}: {
  chart: Pick<DashboardChart, "datasetId" | "title" | "plan">;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next);
        }}
      >
        <Dialog.Trigger
          render={<Button variant="outline" />}
          disabled={disabled}
        >
          <Pin aria-hidden="true" />
          Pin to dashboard
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg">
            <div className="grid gap-1">
              <Dialog.Title className="text-lg font-semibold">
                Pin to dashboard
              </Dialog.Title>
              <Dialog.Description className="wrap-break-word text-sm text-muted-foreground">
                Save “{chart.title}” to a dashboard in this browser.
              </Dialog.Description>
            </div>
            {open && (
              <PinChartForm
                chart={chart}
                saving={saving}
                setSaving={setSaving}
                onPinned={(id) => {
                  setPinned(id);
                  setOpen(false);
                }}
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {pinned && (
        <span role="status" className="text-sm text-muted-foreground">
          Chart pinned.{" "}
          <Link
            to={`/workspace/dashboards?dashboard=${pinned}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            View dashboard
          </Link>
        </span>
      )}
    </div>
  );
}

function PinChartForm({
  chart,
  saving,
  setSaving,
  onPinned,
}: {
  chart: Pick<DashboardChart, "datasetId" | "title" | "plan">;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onPinned: (id: string) => void;
}) {
  const nameId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dashboards = useLiveQuery(() =>
    workspaceDb.dashboards
      .orderBy("createdAt")
      .reverse()
      .toArray()
      .catch(() => null),
  );

  const dashboardId =
    dashboards?.find(({ id }) => id === selected)?.id ??
    (selected === "new" ? "new" : (dashboards?.[0]?.id ?? "new"));
  const creating = dashboardId === "new";

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboards || saving || (creating && !name.trim())) return;

    setSaving(true);
    setError(null);
    try {
      onPinned(
        await pinChart(
          creating ? { title: name.trim() } : { id: dashboardId },
          chart,
        ),
      );
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name === "Error"
          ? failure.message
          : "Could not pin this chart. Check browser storage and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {dashboards === undefined && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading dashboards…
        </p>
      )}
      {dashboards === null && (
        <p role="alert" className="text-sm text-destructive">
          Could not read saved dashboards. Check browser storage and try again.
        </p>
      )}
      {!!dashboards?.length && (
        <SelectField
          label="Dashboard"
          options={[
            ...dashboards.map(({ id, title }) => ({ value: id, label: title })),
            { value: "new", label: "Create a dashboard" },
          ]}
          value={dashboardId}
          disabled={saving}
          onChange={setSelected}
        />
      )}
      {dashboards && creating && (
        <div className="grid gap-1.5">
          <label htmlFor={nameId} className="text-sm font-medium">
            Dashboard name
          </label>
          <input
            id={nameId}
            className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={name}
            placeholder="Sales overview"
            required
            maxLength={100}
            disabled={saving}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Dialog.Close render={<Button variant="outline" />} disabled={saving}>
          Cancel
        </Dialog.Close>
        <Button
          type="submit"
          disabled={!dashboards || saving || (creating && !name.trim())}
        >
          {saving ? "Pinning…" : "Pin chart"}
        </Button>
      </div>
    </form>
  );
}
