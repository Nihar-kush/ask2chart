import { useId, useState, type SubmitEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export function DashboardNameDialog({
  action,
  label,
  initialName = "",
  onSave,
}: {
  action: string;
  label: string;
  initialName?: string;
  onSave: (title: string) => Promise<void>;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = name.trim();
    if (!title || saving) return;

    setSaving(true);
    setFailed(false);
    try {
      await onSave(title);
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        setName(initialName);
        setFailed(false);
        setOpen(next);
      }}
    >
      <Dialog.Trigger
        render={<Button variant={initialName ? "outline" : "default"} />}
        aria-label={initialName ? `${action} for ${initialName}` : undefined}
      >
        {action}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            {action}
          </Dialog.Title>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-1.5">
              <label htmlFor={inputId} className="text-sm font-medium">
                {label}
              </label>
              <input
                id={inputId}
                className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-hidden focus-visible:border-ring"
                value={name}
                required
                maxLength={100}
                disabled={saving}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </div>
            {failed && (
              <p role="alert" className="text-sm text-destructive">
                Could not save the name. Try again.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close
                render={<Button variant="outline" />}
                disabled={saving}
              >
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={!name.trim() || saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
