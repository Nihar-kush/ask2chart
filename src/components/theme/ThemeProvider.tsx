import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ThemeContext, type ThemePreference } from "./theme";

const storageKey = "ask2chart-theme";
const darkScheme = "(prefers-color-scheme: dark)";

function readTheme(): ThemePreference {
  try {
    const theme = localStorage.getItem(storageKey);
    return theme === "light" || theme === "dark" ? theme : "system";
  } catch {
    return "system";
  }
}

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(darkScheme);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function systemUsesDarkTheme() {
  return window.matchMedia(darkScheme).matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setPreference] = useState(readTheme);
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemUsesDarkTheme,
  );
  const systemTheme = systemDark ? "dark" : "light";
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((preference: ThemePreference) => {
    setPreference(preference);
    try {
      localStorage.setItem(storageKey, preference);
    } catch {
      // Keep the selected appearance when browser storage is blocked
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
