import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Brand = "3" | "oister" | "skov";
export type Mode = "light" | "dark";

interface ThemeCtx {
  brand: Brand;
  mode: Mode;
  setBrand: (b: Brand) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "pb_theme";

function load(): { brand: Brand; mode: Mode } {
  if (typeof window === "undefined") return { brand: "3", mode: "light" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (
        (p.brand === "3" || p.brand === "oister" || p.brand === "skov") &&
        (p.mode === "light" || p.mode === "dark")
      ) {
        return p;
      }
    }
  } catch {}
  return { brand: "3", mode: "light" };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [brand, setBrand] = useState<Brand>(initial.brand);
  const [mode, setMode] = useState<Mode>(initial.mode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-3", "theme-oister", "theme-skov", "light", "dark");
    root.classList.add(`theme-${brand}`, mode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ brand, mode }));
    } catch {}
  }, [brand, mode]);

  const toggleMode = () => setMode(mode === "light" ? "dark" : "light");

  return (
    <Ctx.Provider value={{ brand, mode, setBrand, setMode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}