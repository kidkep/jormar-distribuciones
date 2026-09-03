import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gold-50 p-6">
      <div className="modal-content w-full max-w-md rounded-2xl p-10 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100">
          <Compass className="h-8 w-8 text-gold-600" />
        </div>
        <h1 className="bg-gradient-to-r from-gold-500 to-gold-700 bg-clip-text text-7xl font-extrabold text-transparent">404</h1>
        <p className="mt-4 text-lg font-semibold text-gray-900">Pagina no encontrada</p>
        <p className="mt-1 text-sm text-gray-500">La página que buscas no existe o fue movida.</p>
        <Link
          to="/"
          className="btn-gold mt-8 inline-flex items-center gap-2"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
