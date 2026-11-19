import { useState, type ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmAction({
  action,
  title,
  description,
  disabled,
  ariaLabel,
  onConfirm,
}: {
  action: string;
  title: string;
  description: ReactNode;
  disabled: boolean;
  ariaLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    if (busy || disabled) return;
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (busy) return;
        setOpen(nextOpen);
        setFailed(false);
      }}
    >
      <AlertDialog.Trigger
        render={<Button variant="ghost" />}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {action}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-overlay" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg">
          <div className="grid gap-1">
            <AlertDialog.Title className="wrap-break-word text-lg font-semibold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>
          {failed && (
            <p role="alert" className="text-sm text-destructive">
              Could not {action.toLowerCase()}. Try again.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Close
              render={<Button variant="outline" />}
              disabled={busy}
            >
              Cancel
            </AlertDialog.Close>
            <Button
              variant="destructive"
              disabled={busy || disabled}
              onClick={() => void confirm()}
            >
              {busy ? "Working…" : action}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
