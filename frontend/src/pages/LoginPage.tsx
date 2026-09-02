import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginLoading, loginError } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  const handleBgMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = bgRef.current;
    if (!el) return;
    el.style.setProperty("--bg-x", `${e.clientX}px`);
    el.style.setProperty("--bg-y", `${e.clientY}px`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  return (
    <div
      ref={bgRef}
      onMouseMove={handleBgMouseMove}
      style={{ "--bg-x": "50vw", "--bg-y": "50vh" } as React.CSSProperties}
      className="group relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-4"
    >
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(199,154,50,0.12)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute left-10 top-1/2 hidden h-72 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-500/60 to-transparent lg:block" />
      <div className="pointer-events-none absolute right-10 top-1/2 hidden h-72 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-500/60 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(400px_circle_at_var(--bg-x)_var(--bg-y),rgba(199,154,50,0.14),transparent_65%)]" />

      <div className="relative w-full max-w-md">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          style={{ "--spot-x": "50%", "--spot-y": "50%" } as React.CSSProperties}
          className="group relative rounded-2xl border border-gold-500/25 bg-neutral-900/70 p-8 shadow-[0_0_60px_rgba(199,154,50,0.15)] backdrop-blur transition-colors duration-300 hover:border-gold-500/50"
        >
          <div className="mb-6 text-center">
            <img
              src="/logo.png"
              alt="Jormar Distribuciones"
              className="mx-auto mb-4 h-20 w-20 rounded-full object-contain ring-2 ring-gold-500/50"
            />
            <h1 className="text-2xl font-bold tracking-tight text-gold-400">JORMAR DISTRIBUCIONES</h1>
            <p className="mt-1 text-sm text-neutral-400">Gestor de Negocio</p>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/50" />
            <span className="text-xs uppercase tracking-widest text-gold-500/90">Iniciar Sesion</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/50" />
          </div>

          {loginError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              Usuario o contrasena incorrectos
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
                placeholder="Ingrese su usuario"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
                  placeholder="Ingrese su contrasena"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-gold-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 py-2.5 text-sm font-semibold text-neutral-950 transition hover:from-gold-400 hover:to-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:opacity-50"
            >
              {isLoginLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-600">
            Jormar Distribuciones &copy; 2026 &middot; JC &middot; v1.0
          </p>

          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(180px_circle_at_var(--spot-x)_var(--spot-y),rgba(199,154,50,0.18),transparent_70%)]" />
        </div>
      </div>
    </div>
  );
}
