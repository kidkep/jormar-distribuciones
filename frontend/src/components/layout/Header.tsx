import { Menu, LogOut, User, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const canExport =
    user?.is_superuser || (user?.permissions ?? []).includes("sistema.exportar_db");

  const downloadBackup = async () => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const token = localStorage.getItem("token");
    const res = await fetch(`${baseUrl}/export/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      alert("Error al generar la exportación de la base de datos");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : "backup.zip";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="glass-panel relative z-10 flex h-16 items-center justify-between border-b border-white/50 px-4">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-600 transition hover:bg-gold-500/10 hover:text-gold-700 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <h2 className="animate-hero-shimmer bg-gradient-to-r from-gold-700 via-gold-500 to-gold-700 bg-clip-text text-lg font-bold tracking-wide text-transparent">
          JORMAR DISTRIBUCIONES
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {canExport && (
          <button
            onClick={downloadBackup}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-3 py-2 text-sm font-medium text-neutral-950 shadow-md transition hover:brightness-105 active:scale-95"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Exportación de base de datos</span>
          </button>
        )}
        <div className="flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm ring-1 ring-white/70">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/20 text-gold-700">
            <User className="h-3.5 w-3.5" />
          </span>
          <span className="hidden sm:inline">{user?.full_name || user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 transition hover:bg-gold-500/10 hover:text-gold-700 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
