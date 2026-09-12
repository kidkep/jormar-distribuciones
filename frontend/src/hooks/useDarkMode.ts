import { useCallback, useEffect, useState } from "react";
import { applyDark, getDarkStored } from "@/lib/darkMode";

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => getDarkStored());

  useEffect(() => {
    const handler = () => setDark(getDarkStored());
    window.addEventListener("jormar-dark-changed", handler);
    return () => window.removeEventListener("jormar-dark-changed", handler);
  }, []);

  const toggle = useCallback(() => {
    applyDark(!getDarkStored());
  }, []);

  return { dark, toggle };
}