const THEME_KEY = "jormar_theme";

export type ThemeName =
  | "gold"
  | "emerald"
  | "teal"
  | "blue"
  | "indigo"
  | "purple"
  | "fuchsia"
  | "rose"
  | "red"
  | "orange"
  | "cyan";

export const THEMES: { name: ThemeName; label: string; swatch: string }[] = [
  { name: "gold", label: "Oro", swatch: "#C79A32" },
  { name: "emerald", label: "Esmeralda", swatch: "#10B981" },
  { name: "teal", label: "Verde Azulado", swatch: "#14B8A6" },
  { name: "blue", label: "Azul", swatch: "#2563EB" },
  { name: "indigo", label: "Índigo", swatch: "#6366F1" },
  { name: "purple", label: "Púrpura", swatch: "#9333EA" },
  { name: "fuchsia", label: "Fucsia", swatch: "#D946EF" },
  { name: "rose", label: "Rosa", swatch: "#E11D48" },
  { name: "red", label: "Rojo", swatch: "#EF4444" },
  { name: "orange", label: "Naranja", swatch: "#F97316" },
  { name: "cyan", label: "Cian", swatch: "#06B6D4" },
];

export function isTheme(name: string): name is ThemeName {
  return THEMES.some((t) => t.name === name);
}

export function getTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  return saved && isTheme(saved) ? saved : "gold";
}

export function applyTheme(name: string): void {
  const valid = isTheme(name) ? name : "gold";
  document.documentElement.setAttribute(
    "data-theme",
    valid === "gold" ? "" : valid
  );
  localStorage.setItem(THEME_KEY, valid);
}

export function initTheme(): void {
  applyTheme(getTheme());
}
