import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBody, createGarment, disposeObject } from "./mannequinModel";

interface Mannequin3DProps {
  garment?: string | null;
  size?: string;
  color?: string;
  height?: number;
}

const GARMENT_KEYWORDS: [string, string[]][] = [
  ["buso", ["buzo", "buso", "sudadera", "hoodie"]],
  ["camisa", ["camisa", "guayabera"]],
  ["camiseta", ["camiseta", "t-shirt", "tshirt", "polera", "franela"]],
  ["chaqueta", ["chaqueta", "casaca", "jacket", "impermeable"]],
  ["chaleco", ["chaleco", "vest"]],
  ["overol", ["overol", "overall", "mono industrial"]],
  ["pantalon", ["pantalon", "jean", "jeans", "pants", "pantalón"]],
  ["calzado", ["bota", "botas", "calzado", "zapato", "zapatos", "tenis"]],
  ["casco", ["casco", "helmet"]],
  ["guante", ["guante", "guantes", "gloves"]],
];

export const GARMENT_LABELS: Record<string, string> = {
  buso: "Buso",
  camisa: "Camisa",
  camiseta: "Camiseta",
  chaqueta: "Chaqueta",
  chaleco: "Chaleco",
  overol: "Overol",
  pantalon: "Pantalón",
  calzado: "Calzado",
  casco: "Casco",
  guante: "Guantes",
};

export function detectGarmentType(name: string): string | null {
  const n = name.toLowerCase();
  for (const [key, keywords] of GARMENT_KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return key;
  }
  return null;
}

function sizeFactor(size?: string): number {
  const s = (size || "").toUpperCase().trim();
  const letters: Record<string, number> = {
    XS: 0.93, S: 0.96, M: 1.0, L: 1.05, XL: 1.1, XXL: 1.15, XXXL: 1.2,
  };
  if (letters[s]) return letters[s];
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n >= 28 && n <= 48) return 0.93 + (n - 28) * (0.22 / 20);
    return 1.0;
  }
  return 1.0;
}

export function Mannequin3D({ garment, size, color, height = 420 }: Mannequin3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    camera.position.set(0.6, 2.2, 6.2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a2420, 0.65));

    const key = new THREE.DirectionalLight(0xfff3e0, 1.7);
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
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd0ff, 0.45);
    fill.position.set(-5, 3, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xc79a32, 0.85);
    rim.position.set(-3, 4.5, -6);
    scene.add(rim);

    const groundGeo = new THREE.PlaneGeometry(24, 24);
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
    controls.zoomSpeed = 0.9;
    controls.enablePan = false;

    const body = createBody();
    body.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(body);

    const clothes = new THREE.Group();
    scene.add(clothes);

    let currentGarment: THREE.Group | null = null;

    const rebuildGarments = () => {
      if (currentGarment) {
        clothes.remove(currentGarment);
        disposeObject(currentGarment);
        currentGarment = null;
      }
      if (!garment) return;
      const hex = parseInt((color || "666666").replace("#", ""), 16);
      currentGarment = createGarment(garment, sizeFactor(size), hex);
      currentGarment.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      clothes.add(currentGarment);
    };

    rebuildGarments();

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

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      disposeObject(body);
      if (currentGarment) disposeObject(currentGarment);
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [garment, size, color]);

  return <div ref={containerRef} style={{ width: "100%", height }} className="relative" />;
}