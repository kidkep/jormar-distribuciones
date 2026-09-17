import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { loadCharacter, emptyCharacter, type CharacterInstance } from "./character3d/characterLoader";
import { instantiateGarment, disposeGarment } from "./character3d/garmentLoader";
import type { Gender, FittingItem, ViewName, BackgroundName } from "./character3d/types";

export { GARMENT_LABELS, detectGarmentType } from "./mannequinModel";
export type { Gender, FittingItem, ViewName, BackgroundName } from "./character3d/types";

interface Props {
  items: FittingItem[];
  gender: Gender;
  background?: BackgroundName;
  view?: ViewName;
  resetNonce?: number;
  height?: number;
}

interface Engine {
  rebuild: () => void;
  setBackground: (b: BackgroundName) => void;
  setView: (v: ViewName, animate: boolean) => void;
}

type BodyState = "loading" | "ready" | "missing";

const VIEW_POSITIONS: Record<ViewName, [number, number, number]> = {
  front: [0, 1.02, 3.2],
  back: [0, 1.02, -3.2],
  left: [-3.2, 1.02, 0],
  right: [3.2, 1.02, 0],
  three: [2.15, 1.2, 2.35],
};

function makeBackdrop(kind: BackgroundName): THREE.Texture | THREE.Color {
  if (kind === "white") return new THREE.Color(0xf4f5f8);
  if (kind === "gray") return new THREE.Color(0x767c86);
  if (kind === "dark") return new THREE.Color(0x14161b);
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#eef2f8");
    grad.addColorStop(0.55, "#d6dbe4");
    grad.addColorStop(1, "#b3b9c5");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Mannequin3D({
  items,
  gender,
  background = "studio",
  view = "front",
  resetNonce = 0,
  height = 460,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const itemsRef = useRef(items);
  const genderRef = useRef(gender);
  const [bodyState, setBodyState] = useState<BodyState>("loading");
  const [missingGarments, setMissingGarments] = useState<string[]>([]);

  const signature = useMemo(
    () =>
      items
        .map((i) => `${i.key}:${i.size}:${i.color}:${i.layer ?? ""}:${i.modelUrl ?? ""}:${i.hasModel ? 1 : 0}`)
        .join("|"),
    [items],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
    camera.position.set(...VIEW_POSITIONS.front);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    scene.add(new THREE.AmbientLight(0xffffff, 0.24));
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a2420, 0.5));

    const key = new THREE.DirectionalLight(0xfff3e0, 1.6);
    key.position.set(2.2, 4.2, 2.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.2;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -1.6;
    key.shadow.camera.right = 1.6;
    key.shadow.camera.top = 2.6;
    key.shadow.camera.bottom = -0.4;
    key.shadow.bias = -0.0006;
    key.shadow.radius = 3;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
    fill.position.set(-2.6, 1.8, 1.8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xc79a32, 0.8);
    rim.position.set(-1.6, 2.6, -3.2);
    scene.add(rim);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.001;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.95, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.3;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.85;
    controls.enablePan = false;

    const bodyGroup = new THREE.Group();
    const clothes = new THREE.Group();
    scene.add(bodyGroup);
    scene.add(clothes);

    let character: CharacterInstance | null = null;
    let loadedGender: Gender | null = null;
    let generation = 0;

    const clearGarments = () => {
      for (const child of [...clothes.children]) {
        clothes.remove(child);
        disposeGarment(child);
      }
    };

    const rebuild = async () => {
      const gen = ++generation;

      if (loadedGender !== genderRef.current) {
        if (character) {
          bodyGroup.remove(character.scene);
          character = null;
        }
        loadedGender = null;
        setBodyState("loading");
        try {
          const loaded = await loadCharacter(genderRef.current);
          if (gen !== generation) return;
          character = loaded;
          loadedGender = genderRef.current;
          bodyGroup.add(loaded.scene);
          setBodyState("ready");
        } catch {
          if (gen !== generation) return;
          character = emptyCharacter();
          loadedGender = genderRef.current;
          setBodyState("missing");
        }
      }

      clearGarments();
      const activeCharacter = character;
      if (!activeCharacter) return;
      const missing: string[] = [];
      for (const item of itemsRef.current) {
        if (!item.modelUrl || !activeCharacter.hasModel) {
          if (!item.modelUrl) missing.push(item.type);
          continue;
        }
        try {
          const object = await instantiateGarment(item.modelUrl, {
            character: activeCharacter,
            size: item.size,
            color: item.color,
          });
          if (gen !== generation) {
            disposeGarment(object);
            return;
          }
          clothes.add(object);
        } catch {
          missing.push(item.type);
        }
      }
      if (gen === generation) setMissingGarments(missing);
    };

    const anim = { active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };

    const setView = (v: ViewName, animate: boolean) => {
      const dest = new THREE.Vector3(...VIEW_POSITIONS[v]);
      controls.target.set(0, 0.95, 0);
      if (animate) {
        anim.from.copy(camera.position);
        anim.to.copy(dest);
        anim.t = 0;
        anim.active = true;
      } else {
        anim.active = false;
        camera.position.copy(dest);
      }
    };

    const setBackground = (b: BackgroundName) => {
      const bg = makeBackdrop(b);
      const prev = scene.background;
      scene.background = bg;
      if (prev && (prev as THREE.Texture).isTexture) (prev as THREE.Texture).dispose();
    };

    controls.addEventListener("start", () => {
      anim.active = false;
    });

    engineRef.current = { rebuild: () => void rebuild(), setBackground, setView };
    setBackground(background);
    void rebuild();
    setView(view, false);

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (anim.active) {
        anim.t += dt / 0.55;
        const e = anim.t >= 1 ? 1 : 1 - Math.pow(1 - anim.t, 3);
        camera.position.lerpVectors(anim.from, anim.to, e);
        if (anim.t >= 1) anim.active = false;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      generation++;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      clearGarments();
      groundGeo.dispose();
      groundMat.dispose();
      if (scene.background && (scene.background as THREE.Texture).isTexture) {
        (scene.background as THREE.Texture).dispose();
      }
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    genderRef.current = gender;
    engineRef.current?.rebuild();
  }, [gender]);

  useEffect(() => {
    itemsRef.current = items;
    engineRef.current?.rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    engineRef.current?.setBackground(background);
  }, [background]);

  useEffect(() => {
    engineRef.current?.setView(view, true);
  }, [view]);

  useEffect(() => {
    if (resetNonce > 0) {
      itemsRef.current = items;
      engineRef.current?.setView("front", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  const bodyFile = "human_malefemale_basemesh_rigged.glb";

  return (
    <div className="relative" style={{ width: "100%", height }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      {bodyState !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-100 to-slate-300 px-6 text-center">
          <svg viewBox="0 0 120 300" className="h-40 w-auto text-slate-400/70" fill="currentColor" aria-hidden="true">
            <circle cx="60" cy="30" r="24" />
            <path d="M60 62c-24 0-42 16-45 40l-6 46c-1 10 5 18 15 18 7 0 12-5 14-13l7-30 3 60-6 82c-1 11 6 19 16 19s16-8 16-19l-4-70h8l-4 70c0 11 6 19 16 19s17-8 16-19l-6-82 3-60 7 30c2 8 7 13 14 13 10 0 16-8 15-18l-6-46c-3-24-21-40-45-40z" />
          </svg>
          <p className="text-sm font-semibold text-slate-700">
            {bodyState === "loading" ? "Cargando modelo 3D…" : "Modelo 3D del personaje no disponible"}
          </p>
          {bodyState === "missing" && (
            <p className="max-w-sm text-xs text-slate-500">
              Coloca el archivo <code className="rounded bg-slate-200 px-1">{bodyFile}</code> en{" "}
              <code className="rounded bg-slate-200 px-1">public/models</code> para visualizar el probador virtual.
            </p>
          )}
        </div>
      )}
      {bodyState === "ready" && missingGarments.length > 0 && (
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white">
          {missingGarments.length} prenda(s) sin modelo 3D asociado
        </div>
      )}
    </div>
  );
}
