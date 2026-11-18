import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import type { ExplanationRequest } from "@/types/analysis";

export function ExplanationConsent({
  payload,
  disabled,
  onApprove,
}: {
  payload: ExplanationRequest;
  disabled: boolean;
  onApprove: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />} disabled={disabled}>
        Explain result
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={popupRef}
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg"
        >
          <div className="grid gap-1">
            <Dialog.Title className="text-lg font-semibold">
              Share this result?
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Our AI will receive the chart details and observations calculated
              from the groups below. Your full CSV stays in this browser.
            </Dialog.Description>
          </div>

          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="font-medium">Recipient</dt>
              <dd className="text-muted-foreground">
                Ask2Chart Assistant, powered by Groq
              </dd>
            </div>
            <div>
              <dt className="font-medium">Chart</dt>
              <dd className="whitespace-pre-wrap wrap-break-word text-muted-foreground">
                {payload.title}
              </dd>
            </div>
            {payload.question !== null && (
              <div>
                <dt className="font-medium">Original question</dt>
                <dd className="whitespace-pre-wrap wrap-break-word text-muted-foreground">
                  {payload.question}
                </dd>
              </div>
            )}
          </dl>

          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-medium">
              {payload.rows.length < payload.resultGroupCount
                ? `Using ${payload.rows.length} of ${payload.resultGroupCount} result groups`
                : `Using ${payload.rows.length} result ${payload.rows.length === 1 ? "group" : "groups"}`}
            </p>
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">
                Aggregate values used for the explanation
              </caption>
              <thead>
                <tr className="border-b">
                  <th
                    scope="col"
                    className="wrap-break-word py-2 pr-2 font-medium"
                  >
                    {payload.groupLabel}
                  </th>
                  <th
                    scope="col"
                    className="wrap-break-word py-2 text-right font-medium"
                  >
                    {payload.metricLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payload.rows.map(({ group, value }, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <th
                      scope="row"
                      className="wrap-break-word py-1.5 pr-2 font-normal"
                    >
                      {group}
                    </th>
                    <td className="wrap-break-word py-1.5 text-right tabular-nums">
                      {value ?? (
                        <span className="text-muted-foreground">No value</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Dialog.Close render={<Button variant="outline" />}>
              Cancel
            </Dialog.Close>
            <Dialog.Close
              render={<Button />}
              onClick={onApprove}
              disabled={disabled}
            >
              Share and explain
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
