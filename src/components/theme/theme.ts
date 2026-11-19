import { createContext, useContext } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const ThemeContext = createContext<{
  theme: ThemePreference;
  resolvedTheme: Exclude<ThemePreference, "system">;
  setTheme: (theme: ThemePreference) => void;
} | null>(null);

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
