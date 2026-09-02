const THEME_KEY = "jormar_theme";

export type ThemeName = "gold" | "emerald" | "blue" | "purple" | "rose";

export const THEMES: { name: ThemeName; label: string; swatch: string }[] = [
  { name: "gold", label: "Oro", swatch: "#C79A32" },
  { name: "emerald", label: "Esmeralda", swatch: "#10B981" },
  { name: "blue", label: "Azul", swatch: "#2563EB" },
  { name: "purple", label: "Púrpura", swatch: "#9333EA" },
  { name: "rose", label: "Rosa", swatch: "#E11D48" },
];

export function getTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
  return saved && THEMES.some((t) => t.name === saved) ? saved : "gold";
}

export function applyTheme(name: ThemeName): void {
  document.documentElement.setAttribute(
    "data-theme",
    name === "gold" ? "" : name
  );
  localStorage.setItem(THEME_KEY, name);
}

export function initTheme(): void {
  applyTheme(getTheme());
}
