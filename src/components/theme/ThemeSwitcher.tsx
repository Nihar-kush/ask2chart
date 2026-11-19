import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme";

const appearances = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  system: { label: "System", icon: Monitor },
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { label, icon: Icon } = appearances[theme];

  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="outline" size="icon-lg" />}
        aria-label={`Appearance (${label})`}
        title="Change appearance"
      >
        <Icon aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50">
          <Menu.Popup
            aria-label="Appearance"
            className="min-w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <Menu.RadioGroup value={theme} onValueChange={setTheme}>
              {Object.entries(appearances).map(
                ([mode, { label, icon: ModeIcon }]) => (
                  <Menu.RadioItem
                    key={mode}
                    value={mode}
                    closeOnClick
                    className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-checked:font-medium"
                  >
                    <ModeIcon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    <Menu.RadioItemIndicator>
                      <Check aria-hidden="true" className="size-4 shrink-0" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ),
              )}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
