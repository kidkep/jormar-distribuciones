import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-lg text-gray-600">Pagina no encontrada</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700"
      >
        Volver al Dashboard
      </Link>
    </div>
  );
}
