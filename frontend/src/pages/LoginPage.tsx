import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginLoading, loginError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Jormar Distribuciones" className="mx-auto mb-4 h-20 w-20 rounded-full object-contain ring-2 ring-gold-500/40 shadow-lg" />
          <h1 className="text-2xl font-bold text-gold-400">JORMAR DISTRIBUCIONES</h1>
          <p className="mt-1 text-gold-200">Gestor de Negocio</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-xl font-semibold text-gray-800">
            Iniciar Sesion
          </h2>

          {loginError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              Usuario o contrasena incorrectos
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                placeholder="Ingrese su usuario"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                  placeholder="Ingrese su contrasena"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="w-full rounded-lg bg-gold-500 py-2.5 text-sm font-medium text-neutral-950 hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:opacity-50"
            >
              {isLoginLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
