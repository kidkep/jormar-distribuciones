import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
    XS: 0.92, S: 0.96, M: 1.0, L: 1.06, XL: 1.12, XXL: 1.18, XXXL: 1.24,
  };
  if (letters[s]) return letters[s];
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n >= 28 && n <= 48) return 0.92 + (n - 28) * (0.24 / 20);
    return 1.0;
  }
  return 1.0;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
  m.needsUpdate = true;
  return m;
}

export function Mannequin3D({ garment, size, color, height = 420 }: Mannequin3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.15, 6.2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.7);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xc79a32, 0.45);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.75, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.9;

    const disposables: { dispose(): void }[] = [];
    const skin = mat(0xd9b08c);
    const skinDark = mat(0xc99f70);
    const body = new THREE.Group();

    const sphere = (r: number, x: number, y: number, z: number, m: THREE.Material, p: THREE.Object3D) => {
      const geo = new THREE.SphereGeometry(r, 32, 24);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      p.add(mesh);
      disposables.push(geo);
    };
    const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, m: THREE.Material, p: THREE.Object3D, rz = 0, rx = 0) => {
      const geo = new THREE.CylinderGeometry(rt, rb, h, 24);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.z = rz;
      mesh.rotation.x = rx;
      p.add(mesh);
      disposables.push(geo);
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, p: THREE.Object3D) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      p.add(mesh);
      disposables.push(geo);
    };

    sphere(0.5, 0, 3.42, 0, skin, body);
    cyl(0.16, 0.2, 0.24, 0, 2.98, 0, skinDark, body);
    const torsoGeo = new THREE.CapsuleGeometry(0.82, 0.62, 8, 24);
    const torso = new THREE.Mesh(torsoGeo, skin);
    torso.position.set(0, 2.28, 0);
    body.add(torso);
    disposables.push(torsoGeo);
    box(1.45, 0.32, 0.72, 0, 1.28, 0, skin, body);

    cyl(0.19, 0.15, 0.6, -0.88, 2.72, 0, skin, body, 0.18, 0.12);
    cyl(0.19, 0.15, 0.6, 0.88, 2.72, 0, skin, body, -0.18, 0.12);
    cyl(0.15, 0.12, 0.58, -0.95, 2.16, 0, skin, body, 0.05);
    cyl(0.15, 0.12, 0.58, 0.95, 2.16, 0, skin, body, -0.05);
    sphere(0.13, -0.97, 1.86, 0, skin, body);
    sphere(0.13, 0.97, 1.86, 0, skin, body);

    cyl(0.25, 0.22, 0.62, -0.3, 0.92, 0, skin, body);
    cyl(0.25, 0.22, 0.62, 0.3, 0.92, 0, skin, body);
    cyl(0.21, 0.16, 0.8, -0.3, 0.42, 0, skinDark, body, 0, 0.05);
    cyl(0.21, 0.16, 0.8, 0.3, 0.42, 0, skinDark, body, 0, -0.05);
    box(0.28, 0.18, 0.52, -0.3, 0.12, 0.13, skinDark, body);
    box(0.28, 0.18, 0.52, 0.3, 0.12, 0.13, skinDark, body);

    const baseMat = mat(0x181410);
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.14, 48);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.06, 0);
    body.add(base);
    disposables.push(baseMat, baseGeo);
    const ringMat = mat(0xc79a32, { metalness: 0.7, roughness: 0.35 });
    const ringGeo = new THREE.TorusGeometry(1.4, 0.045, 12, 64);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.14, 0);
    body.add(ring);
    disposables.push(ringMat, ringGeo);

    scene.add(body);

    const clothes = new THREE.Group();
    scene.add(clothes);

    const buildGarments = () => {
      for (let i = clothes.children.length - 1; i >= 0; i--) {
        const c = clothes.children[i] as THREE.Mesh;
        clothes.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      }
      if (!garment) return;

      const f = sizeFactor(size);
      const hex = parseInt((color || "666666").replace("#", ""), 16);
      const fab = mat(hex, { roughness: 0.72 });
      disposables.push(fab);

      const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        const m = new THREE.Mesh(geo, fab);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        clothes.add(m);
        disposables.push(geo);
      };
      const cs = (r: number, len: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
        add(new THREE.CapsuleGeometry(r, len, 8, 24), x, y, z, sx, sy, sz);
      const bx = (w: number, h: number, d: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
        add(new THREE.BoxGeometry(w, h, d), x, y, z, sx, sy, sz);

      const torsoWear = garment === "chaleco" || garment === "overol";
      if (torsoWear) {
        bx(1.72, 1.28, 0.95, 0, 2.35, 0, f, f, f);
      } else {
        cs(0.99, 0.75, 0, 2.32, 0, f, f, f);
      }

      if (garment === "buso" || garment === "camiseta") {
        cs(0.21, 0.14, -0.98, 2.72, 0, f, f, f);
        cs(0.21, 0.14, 0.98, 2.72, 0, f, f, f);
      }
      if (garment === "camisa" || garment === "chaqueta") {
        const ax = garment === "camisa" ? 0.98 : 1.02;
        const ay = garment === "camisa" ? 2.42 : 2.5;
        const rx = garment === "camisa" ? -0.35 : -0.3;
        const m1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 8, 16), fab);
        m1.position.set(-ax, ay, 0);
        m1.rotation.x = rx;
        m1.scale.set(f, f, f);
        clothes.add(m1);
        const m2 = m1.clone();
        m2.position.x = ax;
        m2.rotation.x = -rx;
        clothes.add(m2);
        disposables.push(m1.geometry as THREE.BufferGeometry);
      }
      if (garment === "overol" || garment === "pantalon" || garment === "chaqueta") {
        bx(1.55, 1.25, 0.82, 0, 1.1, 0, f, f, f);
        const legGeo = new THREE.CylinderGeometry(0.36, 0.24, 1.05, 20);
        const ml = new THREE.Mesh(legGeo, fab);
        ml.position.set(-0.3, 0.62, 0);
        ml.scale.set(f, f, f);
        clothes.add(ml);
        const mr = ml.clone();
        mr.position.x = 0.3;
        clothes.add(mr);
        disposables.push(legGeo);
      }
      if (garment === "calzado") {
        bx(0.34, 0.26, 0.6, -0.3, 0.28, 0.14, f, 1, f);
        bx(0.34, 0.26, 0.6, 0.3, 0.28, 0.14, f, 1, f);
      }
      if (garment === "casco") {
        const dome = new THREE.SphereGeometry(0.6, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
        const helm = new THREE.Mesh(dome, fab);
        helm.position.set(0, 3.48, 0);
        helm.scale.set(f, 1, f);
        clothes.add(helm);
        disposables.push(dome);
        const brimGeo = new THREE.TorusGeometry(0.42, 0.05, 10, 40);
        const brim = new THREE.Mesh(brimGeo, fab);
        brim.rotation.x = Math.PI / 2;
        brim.position.set(0, 3.15, 0);
        brim.scale.set(f, 1, f);
        clothes.add(brim);
        disposables.push(brimGeo);
      }
      if (garment === "guante") {
        sphere(0.16, -0.97, 1.84, 0, fab, clothes);
        sphere(0.16, 0.97, 1.84, 0, fab, clothes);
      }
    };

    buildGarments();

    renderer.setSize(100, 100);
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
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [garment, size, color]);

  return <div ref={containerRef} style={{ width: "100%", height }} className="relative" />;
}