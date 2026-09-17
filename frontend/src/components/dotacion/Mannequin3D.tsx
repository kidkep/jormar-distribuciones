import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  createBody,
  createGarment,
  disposeObject,
  type Gender,
} from "./mannequinModel";

export { GARMENT_LABELS, detectGarmentType } from "./mannequinModel";
export type { Gender } from "./mannequinModel";

export interface FittingItem {
  key: string;
  type: string;
  layer?: string | null;
  size: string;
  color: string;
}

export type ViewName = "front" | "back" | "left" | "right" | "three";
export type BackgroundName = "studio" | "white" | "gray" | "dark";

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

const VIEW_POSITIONS: Record<ViewName, [number, number, number]> = {
  front: [0, 2.05, 6.4],
  back: [0, 2.05, -6.4],
  left: [-6.4, 2.05, 0],
  right: [6.4, 2.05, 0],
  three: [4.3, 2.35, 4.7],
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

  const signature = useMemo(
    () => items.map((i) => `${i.key}:${i.type}:${i.size}:${i.color}:${i.layer ?? ""}`).join("|"),
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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(...VIEW_POSITIONS.front);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a2420, 0.5));

    const key = new THREE.DirectionalLight(0xfff3e0, 1.55);
    key.position.set(4, 7.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -1;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 3;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
    fill.position.set(-5, 3, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xc79a32, 0.8);
    rim.position.set(-3, 4.5, -6);
    scene.add(rim);

    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.001;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.95, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.6;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.85;
    controls.enablePan = false;

    const bodyGroup = new THREE.Group();
    const clothes = new THREE.Group();
    scene.add(bodyGroup);
    scene.add(clothes);

    let bodyGender: Gender | null = null;
    let garmentGroup: THREE.Group | null = null;

    const rebuild = () => {
      if (bodyGender !== genderRef.current) {
        disposeObject(bodyGroup);
        bodyGroup.clear();
        const body = createBody(genderRef.current);
        body.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        bodyGroup.add(body);
        bodyGender = genderRef.current;
      }

      if (garmentGroup) {
        clothes.remove(garmentGroup);
        disposeObject(garmentGroup);
      }
      garmentGroup = new THREE.Group();
      for (const item of itemsRef.current) {
        if (!item.type) continue;
        const garment = createGarment({
          type: item.type,
          layer: item.layer,
          size: item.size,
          color: item.color,
        });
        garment.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = true;
        });
        garmentGroup.add(garment);
      }
      clothes.add(garmentGroup);
    };

    const anim = { active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };

    const setView = (v: ViewName, animate: boolean) => {
      const dest = new THREE.Vector3(...VIEW_POSITIONS[v]);
      controls.target.set(0, 1.95, 0);
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

    engineRef.current = { rebuild, setBackground, setView };
    setBackground(background);
    rebuild();
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
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      disposeObject(bodyGroup);
      if (garmentGroup) disposeObject(garmentGroup);
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

  return <div ref={containerRef} style={{ width: "100%", height }} className="relative" />;
}