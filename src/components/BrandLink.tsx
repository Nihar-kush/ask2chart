import { Link } from "react-router";
import { useTheme } from "@/components/theme/theme";

export function BrandLink({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme } = useTheme();
  const ink = resolvedTheme === "dark" ? "white" : "black";

  return (
    <Link
      to="/"
      aria-label="Ask2Chart home"
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <img
        src={`/brand/ask2chart-mark-${ink}.svg`}
        alt=""
        width={compact ? 24 : 28}
        height={compact ? 24 : 28}
        className={compact ? undefined : "sm:hidden"}
      />
      {compact ? (
        <span className="hidden text-base leading-tight font-medium tracking-tight sm:inline">
          Ask2Chart
        </span>
      ) : (
        <img
          src={`/brand/ask2chart-${ink}.svg`}
          alt=""
          width={1880}
          height={386}
          className="hidden h-auto w-34 sm:block"
        />
      )}
    </Link>
  );
}
