import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Sparkles } from "lucide-react";

export function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.full_name?.trim()?.split(" ")[0] || user?.username || "Bienvenido";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-2xl" />

      <div className="relative w-full max-w-xl text-center">
        <div className="animate-fade-up mb-6 flex justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white p-2 shadow-2xl ring-4 ring-blue-400/30">
            <img
              src="/logo.png"
              alt="Jormar Distribuciones"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
        </div>

        <h1 className="animate-fade-up-delay-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          JORMAR <span className="text-blue-300">DISTRIBUCIONES</span>
        </h1>
        <p className="animate-fade-up-delay-1 mt-2 text-sm font-medium tracking-widest text-blue-200/80 uppercase">
          Comercializacion de EPP
        </p>

        <div className="animate-fade-up-delay-2 my-6 flex items-center justify-center gap-3 text-blue-200">
          <div className="h-px w-16 bg-blue-400/40" />
          <Sparkles className="h-5 w-5 text-amber-300" />
          <div className="h-px w-16 bg-blue-400/40" />
        </div>

        <h2 className="animate-fade-up-delay-2 text-xl font-semibold text-blue-100 sm:text-2xl">
          ¡Bienvenido,{" "}
          <span className="text-amber-300">{firstName}</span>!
        </h2>
        <p className="animate-fade-up-delay-3 mx-auto mt-3 max-w-md text-sm text-blue-200/90">
          Nos alegra verte de nuevo. Accede a tu panel para gestionar ventas,
          inventario y finanzas de tu negocio.
        </p>

        <div className="animate-fade-up-delay-3 mt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-blue-800 shadow-xl transition-all hover:bg-blue-50 hover:shadow-2xl"
          >
            Ingresar al Panel
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
