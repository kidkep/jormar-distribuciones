import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

export type Gender = "hombre" | "mujer";

export const GARMENT_LABELS: Record<string, string> = {
  camiseta: "Camiseta",
  camisa: "Camisa",
  polo: "Polo",
  blusa: "Blusa",
  buso: "Buso",
  sudadera: "Sudadera",
  chaqueta: "Chaqueta",
  chaleco: "Chaleco",
  overol: "Overol",
  pantalon: "Pantalón",
  jean: "Jean",
  bermuda: "Bermuda",
  calzado: "Calzado",
  casco: "Casco",
  gorra: "Gorra",
  gafas: "Gafas",
  guante: "Guantes",
};

const KEYWORDS: [string, string[]][] = [
  ["casco", ["casco", "helmet"]],
  ["gorra", ["gorra", "cachucha"]],
  ["gafas", ["gafas", "lentes", "monogafas", "espejuelos"]],
  ["guante", ["guante"]],
  ["camiseta", ["camiseta", "t-shirt", "tshirt", "polera", "franela"]],
  ["camisa", ["camisa", "guayabera"]],
  ["polo", ["polo"]],
  ["blusa", ["blusa"]],
  ["buso", ["buso", "buzo", "sudadera", "hoodie"]],
  ["chaqueta", ["chaqueta", "casaca", "jacket", "impermeable"]],
  ["chaleco", ["chaleco"]],
  ["overol", ["overol", "overall", "mono industrial"]],
  ["pantalon", ["pantalon", "pantalón", "jean", "jeans", "pants"]],
  ["bermuda", ["bermuda", "short"]],
  ["calzado", ["bota", "botas", "calzado", "zapato", "zapatos", "tenis", "botin"]],
];

export function detectGarmentType(name: string): string | null {
  const n = name.toLowerCase();
  for (const [key, keywords] of KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return key;
  }
  return null;
}

export function sizeFactor(size?: string): number {
  const s = (size || "").toUpperCase().trim();
  const letters: Record<string, number> = {
    XS: 0.93, S: 0.96, M: 1.0, L: 1.05, XL: 1.1, XXL: 1.16, XXXL: 1.22,
  };
  if (letters[s]) return letters[s];
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n >= 36 && n <= 46) return 0.9 + (n - 36) * (0.32 / 10);
    if (n >= 28 && n <= 48) return 0.9 + (n - 28) * (0.3 / 20);
  }
  return 1.0;
}

const LAYER_BOOST: Record<string, number> = {
  top: 0,
  mid: 0.03,
  vest: 0.018,
  jacket: 0.052,
};

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
    ...opts,
  });
}

function addMesh(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  pos: [number, number, number],
  scale?: [number, number, number],
  rot?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  g.add(mesh);
  return mesh;
}

function sphere(g: THREE.Group, m: THREE.Material, r: number, pos: [number, number, number], scale?: [number, number, number]) {
  return addMesh(g, new THREE.SphereGeometry(r, 28, 20), m, pos, scale);
}

function box(g: THREE.Group, m: THREE.Material, size: [number, number, number], pos: [number, number, number], rot?: [number, number, number]) {
  return addMesh(g, new THREE.BoxGeometry(size[0], size[1], size[2]), m, pos, undefined, rot);
}

function limb(g: THREE.Group, m: THREE.Material, a: [number, number, number], b: [number, number, number], rStart: number, rEnd: number) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rEnd, rStart, len, 18, 1, false), m);
  mesh.position.copy(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  g.add(mesh);
  return mesh;
}

function lathe(g: THREE.Group, m: THREE.Material, points: [number, number][], zScale = 0.62) {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(vecs, 40), m);
  mesh.scale.set(1, 1, zScale);
  g.add(mesh);
  return mesh;
}

function torus(g: THREE.Group, m: THREE.Material, r: number, tube: number, pos: [number, number, number], flat = true, yScale = 1) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 32), m);
  if (flat) mesh.rotation.x = Math.PI / 2;
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.scale.set(1, yScale, 1);
  g.add(mesh);
  return mesh;
}

// --- Helpers para el cuerpo: tubos suavizados y piel con variacion sutil ---

function radiusAt(t: number, radii: number[]) {
  const n = radii.length - 1;
  const f = Math.max(0, Math.min(1, t)) * n;
  const i = Math.floor(f);
  if (i >= n) return radii[n];
  return radii[i] * (1 - (f - i)) + radii[i + 1] * (f - i);
}

function taperedTube(
  g: THREE.Group,
  m: THREE.Material,
  nodes: [number, number, number][],
  radii: number[],
  radial = 16,
  tubular = 26,
) {
  const pts = nodes.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const p = curve.getPointAt(t);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const r = radiusAt(t, radii);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const nx = Math.cos(a) * n.x + Math.sin(a) * b.x;
      const ny = Math.cos(a) * n.y + Math.sin(a) * b.y;
      const nz = Math.cos(a) * n.z + Math.sin(a) * b.z;
      positions.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      normals.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const c = a + radial + 1;
      indices.push(a, c, a + 1, c, c + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}

function makeSkinTexture(hex: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const base = new THREE.Color(hex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 170; i++) {
    const r = 6 + Math.random() * 26;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const c = base.clone().offsetHSL((Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.045);
    const gd = ctx.createRadialGradient(x, y, 0, x, y, r);
    gd.addColorStop(0, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.3)`);
    gd.addColorStop(1, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0)`);
    ctx.fillStyle = gd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skinMaterial(hex: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    map: makeSkinTexture(hex),
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.55,
    ...extra,
  });
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mm = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
      else mm.dispose();
    }
  });
}

interface BodyCfg {
  shoulderX: number;
  bust: boolean;
  longHair: boolean;
  skinTone: number;
  torso: [number, number][];
  neck: number[];
  arm: number[];
  leg: number[];
  deltoid: number;
}

const MALE: BodyCfg = {
  shoulderX: 0.44,
  bust: false,
  longHair: false,
  skinTone: 0xe3a578,
  torso: [
    [0.235, 1.86], [0.285, 2.0], [0.298, 2.12], [0.276, 2.26], [0.262, 2.4],
    [0.274, 2.5], [0.302, 2.62], [0.328, 2.76], [0.336, 2.88], [0.322, 2.98], [0.185, 3.06],
  ],
  neck: [0.138, 0.126, 0.106],
  arm: [0.108, 0.098, 0.086, 0.073, 0.054],
  leg: [0.166, 0.136, 0.103, 0.092, 0.056],
  deltoid: 0.14,
};

const FEMALE: BodyCfg = {
  shoulderX: 0.375,
  bust: true,
  longHair: true,
  skinTone: 0xe8ad84,
  torso: [
    [0.25, 1.86], [0.305, 2.0], [0.318, 2.12], [0.27, 2.26], [0.238, 2.4],
    [0.25, 2.5], [0.278, 2.62], [0.3, 2.74], [0.306, 2.88], [0.292, 2.98], [0.16, 3.06],
  ],
  neck: [0.114, 0.104, 0.09],
  arm: [0.09, 0.081, 0.071, 0.06, 0.045],
  leg: [0.15, 0.122, 0.093, 0.082, 0.05],
  deltoid: 0.115,
};

export function createBody(gender: Gender): THREE.Group {
  const cfg = gender === "mujer" ? FEMALE : MALE;
  const g = new THREE.Group();
  const sx = cfg.shoulderX;

  const skin = skinMaterial(cfg.skinTone, { roughness: 0.5 });
  const skinShade = skinMaterial(new THREE.Color(cfg.skinTone).multiplyScalar(0.92).getHex(), { roughness: 0.56 });
  const hair = mat(gender === "mujer" ? 0x2f2016 : 0x241d16, { roughness: 0.82, metalness: 0, envMapIntensity: 0.3 });
  const dark = mat(0x171310, { roughness: 0.35 });
  const white = mat(0xf5f2ee, { roughness: 0.3 });
  const lip = mat(0xc98377, { roughness: 0.5 });

  // Torso (perfil humano, seccion aplanada)
  lathe(g, skin, cfg.torso, 0.6);
  // Hombros / trapecio / clavicula
  sphere(g, skin, 0.24, [0, 2.95, -0.01], cfg.bust ? [1.44, 0.4, 0.7] : [1.62, 0.42, 0.72]);
  sphere(g, skin, 0.15, [0, 2.99, -0.03], [1.75, 0.5, 0.82]);
  // Cadera
  sphere(g, skin, 0.27, [0, 2.02, 0], cfg.bust ? [1.05, 0.86, 0.68] : [1.0, 0.86, 0.66]);
  sphere(g, skin, 0.135, [0.1, 1.99, -0.05], [1, 0.95, 1]);
  sphere(g, skin, 0.135, [-0.1, 1.99, -0.05], [1, 0.95, 1]);
  // Pecho
  if (cfg.bust) {
    sphere(g, skin, 0.1, [0.105, 2.7, 0.11], [1.05, 0.9, 0.75]);
    sphere(g, skin, 0.1, [-0.105, 2.7, 0.11], [1.05, 0.9, 0.75]);
  } else {
    sphere(g, skin, 0.11, [0.13, 2.74, 0.1], [1.1, 0.8, 0.62]);
    sphere(g, skin, 0.11, [-0.13, 2.74, 0.1], [1.1, 0.8, 0.62]);
  }

  // Cuello
  taperedTube(g, skin, [[0, 2.92, 0], [0, 3.08, 0.006], [0, 3.24, 0]], cfg.neck, 18, 12);

  // Cabeza
  const head = new THREE.Group();
  head.position.set(0, 3.5, 0);
  g.add(head);

  const headMesh = lathe(head, skin, [
    [0.02, -0.215], [0.06, -0.205], [0.115, -0.175], [0.155, -0.125], [0.178, -0.07],
    [0.183, 0.0], [0.172, 0.07], [0.145, 0.13], [0.095, 0.18], [0.02, 0.205],
  ], 1.0);
  headMesh.scale.x = 0.86;
  // Pómulos / mandíbula
  sphere(head, skin, 0.11, [0.09, -0.05, 0.09], [0.9, 0.8, 0.9]);
  sphere(head, skin, 0.11, [-0.09, -0.05, 0.09], [0.9, 0.8, 0.9]);
  sphere(head, skin, 0.06, [0, -0.19, 0.07], [1, 0.8, 1.15]);
  // Cejas (cresta)
  sphere(head, skin, 0.14, [0, 0.035, 0.11], [0.86, 0.34, 0.6]);
  // Nariz
  sphere(head, skin, 0.026, [0, 0.015, 0.175], [0.55, 1.5, 0.7]);
  sphere(head, skin, 0.028, [0, -0.035, 0.188], [0.85, 0.8, 0.95]);
  sphere(head, skinShade, 0.012, [0.022, -0.05, 0.178], [1, 0.7, 0.7]);
  sphere(head, skinShade, 0.012, [-0.022, -0.05, 0.178], [1, 0.7, 0.7]);
  // Orejas
  sphere(head, skin, 0.05, [0.166, -0.015, -0.012], [0.45, 1.05, 0.85]);
  sphere(head, skin, 0.05, [-0.166, -0.015, -0.012], [0.45, 1.05, 0.85]);
  sphere(head, skinShade, 0.03, [0.17, -0.02, -0.005], [0.4, 1, 0.8]);
  sphere(head, skinShade, 0.03, [-0.17, -0.02, -0.005], [0.4, 1, 0.8]);
  // Ojos
  for (const s of [1, -1]) {
    sphere(head, white, 0.028, [s * 0.072, 0.02, 0.16], [1, 1, 0.7]);
    sphere(head, dark, 0.014, [s * 0.074, 0.02, 0.18], [1, 1, 0.6]);
    sphere(head, skin, 0.031, [s * 0.072, 0.048, 0.158], [1, 0.52, 0.72]);
    box(head, hair, [0.068, 0.011, 0.018], [s * 0.075, 0.066, 0.166], [0, 0, s * 0.13]);
  }
  // Boca
  sphere(head, lip, 0.03, [0, -0.112, 0.166], [1.35, 0.32, 0.5]);
  sphere(head, lip, 0.028, [0, -0.137, 0.164], [1.15, 0.38, 0.5]);

  // Cabello
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 32, 20, 0, Math.PI * 2, 0, Math.PI * (cfg.bust ? 0.6 : 0.55)),
    hair,
  );
  cap.position.set(0, 0.028, -0.004);
  cap.scale.set(cfg.bust ? 0.95 : 0.9, 1.02, 1.0);
  head.add(cap);
  sphere(head, hair, 0.165, [0, -0.03, -0.08], [0.86, 1.0, 0.72]);
  if (cfg.longHair) {
    taperedTube(head, hair, [
      [0, 0.11, -0.11], [0, -0.05, -0.165], [0, -0.2, -0.16], [0, -0.35, -0.115],
    ], [0.185, 0.195, 0.165, 0.095], 20, 20);
    taperedTube(head, hair, [[0.145, 0.06, 0.0], [0.135, -0.12, 0.03], [0.115, -0.26, 0.05]], [0.06, 0.05, 0.028], 10, 10);
    taperedTube(head, hair, [[-0.145, 0.06, 0.0], [-0.135, -0.12, 0.03], [-0.115, -0.26, 0.05]], [0.06, 0.05, 0.028], 10, 10);
  }

  // Brazos
  for (const s of [1, -1]) {
    sphere(g, skin, cfg.deltoid, [s * (sx - 0.005), 2.985, 0], [1.05, 1.0, 0.92]);
    taperedTube(g, skin, [
      [s * sx, 3.0, 0],
      [s * (sx + 0.03), 2.68, -0.006],
      [s * (sx + 0.06), 2.35, 0.0],
      [s * (sx + 0.085), 2.04, -0.006],
      [s * (sx + 0.11), 1.72, 0.005],
    ], cfg.arm, 18, 30);

    // Mano (palma + dedos + pulgar)
    const hand = new THREE.Group();
    hand.position.set(s * (sx + 0.11), 1.615, 0.005);
    hand.rotation.z = s * 0.06;
    g.add(hand);
    sphere(hand, skin, 0.05, [0, 0.05, 0], [0.9, 1, 0.9]);
    sphere(hand, skin, 0.05, [0, 0, 0], [0.46, 1.08, 0.98]);
    const fingerDefs: [number, number][] = [
      [-0.03, 0.06], [-0.011, 0.07], [0.009, 0.066], [0.028, 0.052],
    ];
    for (const [fz, len] of fingerDefs) {
      taperedTube(hand, skin, [
        [0, -0.045, fz],
        [0, -0.045 - len * 0.55, fz + 0.004],
        [0, -0.045 - len, fz + 0.006],
      ], [0.0115, 0.0095, 0.0075], 8, 8);
    }
    taperedTube(hand, skin, [[0, -0.012, 0.038], [0, -0.045, 0.07]], [0.014, 0.011], 8, 8);
  }

  // Piernas
  for (const s of [1, -1]) {
    sphere(g, skin, 0.16, [s * 0.16, 1.99, 0], [1, 0.92, 1]);
    taperedTube(g, skin, [
      [s * 0.16, 1.98, 0],
      [s * 0.155, 1.52, 0],
      [s * 0.15, 1.05, 0],
      [s * 0.145, 0.66, -0.015],
      [s * 0.14, 0.18, 0.0],
    ], cfg.leg, 18, 30);
    sphere(g, skin, cfg.leg[4], [s * 0.14, 0.18, 0], [1, 1, 1]);

    // Pie (talón, empeine, punta, suela)
    sphere(g, skin, 0.07, [s * 0.14, 0.075, -0.075], [1.0, 0.95, 1.05]);
    sphere(g, skin, 0.07, [s * 0.14, 0.062, 0.1], [1.05, 0.8, 1.75]);
    sphere(g, skin, 0.056, [s * 0.14, 0.052, 0.35], [1.15, 0.72, 1.1]);
    sphere(g, skinShade, 0.085, [s * 0.14, 0.03, 0.13], [1.02, 0.32, 2.55]);
    for (let i = -1; i <= 1; i++) {
      sphere(g, skinShade, 0.014, [s * 0.14 + i * 0.03, 0.05, 0.4], [1, 0.8, 1]);
    }
  }

  // Anillo dorado
  const gold = mat(0xc79a32, { metalness: 0.85, roughness: 0.25 });
  torus(g, gold, 0.95, 0.032, [0, 0.015, 0]);

  return g;
}

export interface GarmentSpec {
  type: string;
  layer?: string | null;
  size: string;
  color: string;
}

export function createGarment(spec: GarmentSpec): THREE.Group {
  const type = spec.type || "camiseta";
  const layer = spec.layer || "top";
  const boost = LAYER_BOOST[layer] ?? 0;
  const hex = parseInt((spec.color || "#c0803a").replace("#", ""), 16);
  const g = new THREE.Group();
  const fabric = mat(hex, { roughness: 0.84 });
  const darkHex = new THREE.Color(hex).multiplyScalar(0.76).getHex();
  const fabricDk = mat(darkHex, { roughness: 0.86 });
  const metal = mat(0xcfcfcf, { metalness: 0.8, roughness: 0.3 });
  const z = 0.63;

  const torso = (hemY: number, topY = 3.07) => {
    const b = boost;
    const pts: [number, number][] = [
      [0.335 + b, hemY], [0.325 + b, hemY + 0.16], [0.3 + b, 2.42],
      [0.34 + b, 2.62], [0.375 + b, 2.79], [0.385 + b, 2.92],
      [0.355 + b, topY - 0.05], [0.255 + b, topY],
    ];
    lathe(g, fabric, pts, z);
  };
  const collar = (wide = false) => {
    torus(g, fabricDk, wide ? 0.16 : 0.14, 0.036, [0, 3.02, 0.01], true, 0.62);
    if (wide) {
      box(g, fabricDk, [0.13, 0.11, 0.03], [0.09, 3.02, 0.14], [0.2, 0, 0]);
      box(g, fabricDk, [0.13, 0.11, 0.03], [-0.09, 3.02, 0.14], [0.2, 0, 0]);
    }
  };
  const sleeve = (long: boolean) => {
    const a: [number, number, number] = [0.43 + boost, 2.99, 0];
    if (long) {
      for (const s of [1, -1]) {
        limb(g, fabric, [s * (0.43 + boost), 2.99, 0], [s * (0.55 + boost), 1.78, 0], 0.15 + boost, 0.072 + boost);
        torus(g, fabricDk, 0.075 + boost, 0.022, [s * (0.55 + boost), 1.78, 0], true, 0.9);
      }
    } else {
      for (const s of [1, -1]) {
        limb(g, fabric, [s * (0.43 + boost), 2.99, 0], [s * (0.51 + boost), 2.58, 0], 0.155 + boost, 0.12 + boost);
      }
    }
    void a;
  };
  const buttons = () => {
    for (let i = 0; i < 5; i++) {
      const y = 2.92 - i * 0.17;
      sphere(g, metal, 0.016, [0, y, 0.21 + boost], [1, 1, 0.7]);
    }
    box(g, fabricDk, [0.05, 0.9, 0.02], [0, 2.5, 0.205 + boost]);
  };
  const zipper = () => {
    box(g, metal, [0.035, 0.92, 0.02], [0, 2.52, 0.215 + boost]);
    sphere(g, metal, 0.022, [0, 2.5, 0.23 + boost], [0.7, 1.2, 0.6]);
  };
  const pockets = (y: number, chest = false) => {
    for (const s of [1, -1]) {
      box(g, fabricDk, chest ? [0.11, 0.1, 0.02] : [0.15, 0.14, 0.02], [s * 0.15, y, 0.2 + boost]);
    }
  };
  const hood = () => {
    sphere(g, fabricDk, 0.2, [0, 3.0, -0.16], [1.2, 1.0, 0.95]);
    torus(g, fabric, 0.16, 0.04, [0, 3.0, -0.02], true, 0.7);
  };
  const pants = () => {
    sphere(g, fabric, 0.33, [0, 2.08, 0], [1.04, 0.84, 0.64]);
    torus(g, fabricDk, 0.33, 0.028, [0, 2.3, 0], true, 0.64);
    // Pretina + boton
    sphere(g, metal, 0.02, [0, 2.3, 0.24]);
    for (const s of [1, -1]) {
      limb(g, fabric, [s * 0.16, 2.06, 0], [s * 0.15, 1.0, 0], 0.21, 0.145);
      limb(g, fabric, [s * 0.15, 1.0, 0], [s * 0.14, 0.16, 0], 0.165, 0.1);
      box(g, fabricDk, [0.13, 0.18, 0.02], [s * 0.17, 2.02, 0.2]);
    }
  };
  const boots = () => {
    for (const s of [1, -1]) {
      sphere(g, fabric, 0.135, [s * 0.15, 0.13, 0.16], [1.2, 1.0, 2.6]);
      // Cano / cuello
      limb(g, fabric, [s * 0.14, 0.2, 0.0], [s * 0.14, 0.42, 0.0], 0.14, 0.135);
      torus(g, fabricDk, 0.14, 0.028, [s * 0.14, 0.42, 0], true, 0.9);
      // Punta reforzada
      sphere(g, fabricDk, 0.12, [s * 0.15, 0.09, 0.42], [1.25, 0.9, 1.0]);
      // Suela
      box(g, fabricDk, [0.38, 0.07, 0.82], [s * 0.15, 0.035, 0.18]);
      // Tacón
      box(g, fabricDk, [0.34, 0.12, 0.2], [s * 0.15, 0.1, -0.14]);
      // Cordones
      for (let i = 0; i < 3; i++) {
        box(g, mat(0x222222), [0.2, 0.016, 0.02], [s * 0.14, 0.22 + i * 0.06, 0.2]);
      }
    }
  };
  const helmet = () => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), fabric);
    dome.position.set(0, 3.44, 0);
    dome.scale.set(0.92, 1.02, 0.98);
    g.add(dome);
    torus(g, fabricDk, 0.3, 0.045, [0, 3.43, 0.03], true, 0.98);
    box(g, fabricDk, [0.1, 0.05, 0.24], [0, 3.66, 0.04]);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 24, Math.PI), fabricDk);
    strap.position.set(0, 3.36, 0.02);
    strap.rotation.z = Math.PI;
    g.add(strap);
  };
  const cap = () => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), fabric);
    dome.position.set(0, 3.5, 0.02);
    dome.scale.set(0.95, 1.0, 1.02);
    g.add(dome);
    box(g, fabricDk, [0.36, 0.03, 0.26], [0, 3.5, 0.24]);
  };
  const glasses = () => {
    for (const s of [1, -1]) {
      torus(g, darkHex === hex ? fabricDk : metal, 0.06, 0.012, [s * 0.085, 3.55, 0.2], false);
      box(g, metal, [0.14, 0.012, 0.012], [s * 0.14, 3.55, 0.09]);
    }
    box(g, metal, [0.06, 0.014, 0.014], [0, 3.55, 0.21]);
  };
  const gloves = () => {
    for (const s of [1, -1]) {
      sphere(g, fabric, 0.085, [s * 0.55, 1.62, 0.01], [0.98, 1.6, 0.64]);
      torus(g, fabricDk, 0.08, 0.02, [s * 0.55, 1.72, 0.01], true, 0.8);
    }
  };

  switch (type) {
    case "camiseta":
      torso(2.12); sleeve(false); collar();
      break;
    case "polo":
      torso(2.12); sleeve(false); collar(true); buttons(); pockets(2.6, true);
      break;
    case "blusa":
      torso(2.06); sleeve(true); collar(true);
      break;
    case "camisa":
      torso(2.04); sleeve(true); collar(true); buttons(); pockets(2.6, true);
      break;
    case "buso":
    case "sudadera":
      torso(2.0); sleeve(true); hood(); pockets(2.25);
      break;
    case "chaqueta":
      torso(1.98); sleeve(true); collar(true); zipper(); pockets(2.2);
      break;
    case "chaleco":
      torso(1.98); collar(true); zipper(); pockets(2.3);
      break;
    case "overol":
      torso(2.32); pants(); sleeve(true); collar(true); buttons();
      break;
    case "pantalon":
    case "jean":
      pants();
      break;
    case "bermuda":
      sphere(g, fabric, 0.33, [0, 2.08, 0], [1.04, 0.84, 0.64]);
      torus(g, fabricDk, 0.33, 0.028, [0, 2.3, 0], true, 0.64);
      for (const s of [1, -1]) limb(g, fabric, [s * 0.16, 2.06, 0], [s * 0.15, 1.45, 0], 0.21, 0.17);
      break;
    case "calzado":
      boots();
      break;
    case "casco":
      helmet();
      break;
    case "gorra":
      cap();
      break;
    case "gafas":
      glasses();
      break;
    case "guante":
      gloves();
      break;
    default:
      torso(2.14); sleeve(false); collar();
  }

  g.scale.set(sizeFactor(spec.size), 1, sizeFactor(spec.size));
  return g;
}