import { type ReactNode, useId } from "react";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "cn";

type SelectOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

export function SelectField<Value extends string>({
  label,
  description,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: ReactNode;
  description?: string;
  options: readonly SelectOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
}) {
  const descriptionId = useId();

  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <Select.Root<Value>
        value={value}
        items={options}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <Select.Label className="text-sm font-medium">{label}</Select.Label>
        <Select.Trigger
          type="button"
          aria-describedby={description ? descriptionId : undefined}
          className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:border-ring disabled:opacity-60"
        >
          <Select.Value className="min-w-0 truncate" />
          <Select.Icon className="shrink-0 text-muted-foreground">
            <ChevronDown aria-hidden="true" className="size-4" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            align="start"
            sideOffset={5}
            alignItemWithTrigger={false}
            className="z-50"
          >
            <Select.Popup className="w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
              <Select.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex min-h-9 items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium data-disabled:opacity-50"
                  >
                    <Select.ItemText className="min-w-0 wrap-break-word">
                      {option.label}
                    </Select.ItemText>
                    <Select.ItemIndicator className="absolute right-2">
                      <Check aria-hidden="true" className="size-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
