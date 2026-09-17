import type { Gender } from "./types";

// Ruta del modelo humano. Puede ser un unico GLB con ambos generos
// (cada personaje cuelga de "GLTF_SceneRootNode") o un archivo por genero.
export const CHARACTER_MODELS: Record<Gender, string> = {
  hombre: "/models/human_malefemale_basemesh_rigged.glb",
  mujer: "/models/human_malefemale_basemesh_rigged.glb",
};

// Nombres de los nodos-raiz de cada personaje dentro del GLB combinado.
export const GENDER_NODE_MATCH: Record<Gender, RegExp> = {
  hombre: /(^|[^a-z])male/i,
  mujer: /female/i,
};

// Altura objetivo del personaje en metros (se normaliza automaticamente).
export const CHARACTER_HEIGHT = 1.8;

// Decoders para modelos comprimidos (Draco / KTX2 / Meshopt).
export const DRACO_PATH = "/draco/";
export const KTX2_PATH = "/basis/";

const API_BASE: string = import.meta.env.VITE_API_URL || "/api/v1";

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

// Resuelve rutas de modelos:
// - http(s):// -> tal cual
// - /api/...   -> origen del backend (modelo subido a JORMAR)
// - /models/.. -> archivo estatico del frontend
export function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) {
    if (/^https?:\/\//i.test(API_BASE)) {
      const origin = API_BASE.replace(/\/api\/v\d+\/?$/, "");
      return `${origin}${url}`;
    }
    return url;
  }
  return url;
}
