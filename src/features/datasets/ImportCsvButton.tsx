import { useRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ImportCsvButtonProps = Pick<
  ComponentProps<typeof Button>,
  "children" | "variant" | "size" | "disabled"
> & {
  onImport: (file: File) => void;
};

export function ImportCsvButton({
  onImport,
  children = "Import CSV",
  ...props
}: ImportCsvButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Choose a CSV file"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onImport(file);
        }}
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        {...props}
      >
        {children}
      </Button>
    </>
  );
}
