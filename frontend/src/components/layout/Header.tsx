import { Menu, LogOut, User, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth();

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
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold text-gray-800">
          JORMAR DISTRIBUCIONES
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={downloadBackup}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
        >
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Exportación de base de datos</span>
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user?.full_name || user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
