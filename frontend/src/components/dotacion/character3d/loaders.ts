import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import { DRACO_PATH, KTX2_PATH, getAuthToken } from "./config";

let cachedLoader: GLTFLoader | null = null;
let ktx2Configured = false;

// Un unico GLTFLoader reutilizable con Draco, KTX2 y Meshopt.
export function getGLTFLoader(renderer?: THREE.WebGLRenderer): GLTFLoader {
  if (!cachedLoader) {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    draco.setDecoderConfig({ type: "wasm" });
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    cachedLoader = loader;
  }

  if (renderer && !ktx2Configured) {
    const ktx2 = new KTX2Loader();
    ktx2.setTranscoderPath(KTX2_PATH);
    ktx2.detectSupport(renderer);
    cachedLoader.setKTX2Loader(ktx2);
    ktx2Configured = true;
  }

  return cachedLoader;
}

// Los archivos .glb subidos a JORMAR viven en el backend protegido,
// por lo que adjuntamos el token en las peticiones.
export function withAuthHeader<T extends { setRequestHeader: (h: Record<string, string>) => void }>(loader: T): T {
  const token = getAuthToken();
  if (token) loader.setRequestHeader({ Authorization: `Bearer ${token}` });
  return loader;
}
