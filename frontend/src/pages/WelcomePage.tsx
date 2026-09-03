import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.full_name?.trim()?.split(" ")[0] || user?.username || "Bienvenido";

  const initials = firstName.slice(0, 2).toUpperCase();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-4">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(199,154,50,0.08)_0%,transparent_55%)]" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-glow-pulse" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl animate-glow-pulse" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gold-500/10 blur-2xl animate-glow-pulse" />
        {/* Líneas laterales */}
        <div className="absolute left-10 top-1/2 hidden h-72 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-500/50 to-transparent lg:block" />
        <div className="absolute right-10 top-1/2 hidden h-72 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-500/50 to-transparent lg:block" />
      </div>

      <div className="relative w-full max-w-xl text-center">
        {/* Logo con anillo pulsante */}
        <div className="animate-fade-up mb-8 flex justify-center">
          <div className="animate-float">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white p-2 shadow-2xl">
              <img
                src="/logo.png"
                alt="Jormar Distribuciones"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-full animate-ring-pulse" />
          </div>
        </div>

        <h1 className="animate-fade-up-delay-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="text-white">JORMAR </span>
          <span className="text-gradient-gold">DISTRIBUCIONES</span>
        </h1>
        <p className="animate-fade-up-delay-1 mt-3 text-sm font-medium tracking-[0.25em] text-gold-200/70 uppercase">
          Comercializacion de EPP
        </p>

        <div className="animate-fade-up-delay-2 my-7 flex items-center justify-center gap-3 text-gold-200">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/60" />
          <Sparkles className="h-5 w-5 text-gold-300" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/60" />
        </div>

        {/* Tarjeta de bienvenida */}
        <div className="animate-fade-up-delay-3 mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-neutral-950 shadow-lg shadow-gold-500/30">
              {initials}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/60">Bienvenido de nuevo</p>
              <h2 className="text-xl font-semibold text-gold-300">{firstName}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm text-gold-200/90">
            Gestiona tus ventas, inventario y finanzas de forma eficiente desde un solo panel.
          </p>
        </div>

        <div className="animate-fade-up-delay-4 mt-9">
          <button
            onClick={() => navigate("/dashboard")}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 px-9 py-3.5 text-sm font-semibold text-neutral-950 shadow-xl shadow-gold-500/30 transition-all hover:shadow-2xl hover:shadow-gold-500/40 hover:brightness-105 active:scale-95"
          >
            Ingresar al Panel
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-500/60" />
            Sistema de gestion Jormar Distribuciones
          </div>
        </div>
      </div>
    </div>
  );
}
