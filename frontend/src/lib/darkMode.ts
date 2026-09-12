const DARK_KEY = "jormar_dark";

export function getDarkStored(): boolean {
  try {
    return localStorage.getItem(DARK_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyDark(enabled: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark", enabled);
  try {
    localStorage.setItem(DARK_KEY, enabled ? "1" : "0");
  } catch {
    /* sin persistencia */
  }
  window.dispatchEvent(new CustomEvent("jormar-dark-changed"));
}

export function initDark(): void {
  applyDark(getDarkStored());
}