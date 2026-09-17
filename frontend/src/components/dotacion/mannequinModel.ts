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
  profile: [number, number][];
  shoulderX: number;
  deltoid: number;
  neckR: number;
  upperArm: [number, number];
  foreArm: [number, number];
  thigh: [number, number];
  calf: [number, number];
  bust: boolean;
  longHair: boolean;
}

const MALE: BodyCfg = {
  profile: [
    [0.285, 1.98], [0.315, 2.1], [0.295, 2.3], [0.262, 2.46], [0.285, 2.6],
    [0.325, 2.76], [0.335, 2.9], [0.31, 3.0], [0.2, 3.07],
  ],
  shoulderX: 0.44, deltoid: 0.15, neckR: 0.125,
  upperArm: [0.115, 0.088], foreArm: [0.09, 0.062],
  thigh: [0.175, 0.115], calf: [0.125, 0.068],
  bust: false, longHair: false,
};

const FEMALE: BodyCfg = {
  profile: [
    [0.3, 1.98], [0.335, 2.1], [0.315, 2.28], [0.235, 2.44], [0.25, 2.58],
    [0.285, 2.74], [0.3, 2.9], [0.28, 3.0], [0.185, 3.07],
  ],
  shoulderX: 0.375, deltoid: 0.125, neckR: 0.105,
  upperArm: [0.1, 0.076], foreArm: [0.08, 0.052],
  thigh: [0.16, 0.105], calf: [0.115, 0.06],
  bust: true, longHair: true,
};

export function createBody(gender: Gender): THREE.Group {
  const cfg = gender === "mujer" ? FEMALE : MALE;
  const g = new THREE.Group();
  const skin = mat(0xe4a97e, { roughness: 0.6 });
  const skinDk = mat(0xd0966b, { roughness: 0.64 });
  const hair = mat(gender === "mujer" ? 0x3a2418 : 0x2a2118, { roughness: 0.9, metalness: 0 });
  const dark = mat(0x1c1713, { roughness: 0.4 });
  const white = mat(0xf3f0ec, { roughness: 0.35 });

  const sx = cfg.shoulderX;
  const neckTop = 3.3;

  // Cuello
  limb(g, skin, [0, 2.96, 0], [0, neckTop, 0], cfg.neckR, cfg.neckR * 0.82);
  // Hombros
  sphere(g, skin, 0.2, [0, 2.98, 0], [cfg.bust ? 1.5 : 1.72, 0.5, 0.82]);
  // Torso
  lathe(g, skin, cfg.profile, 0.62);
  sphere(g, skin, 0.29, [0, 2.06, 0], [cfg.bust ? 1.06 : 1.0, 0.82, 0.62]);
  if (cfg.bust) {
    sphere(g, skin, 0.12, [0.13, 2.68, 0.17], [1.05, 0.9, 0.78]);
    sphere(g, skin, 0.12, [-0.13, 2.68, 0.17], [1.05, 0.9, 0.78]);
  } else {
    sphere(g, skin, 0.13, [0.15, 2.72, 0.17], [1.1, 0.85, 0.7]);
    sphere(g, skin, 0.13, [-0.15, 2.72, 0.17], [1.1, 0.85, 0.7]);
  }

  // Cabeza
  const head = new THREE.Group();
  head.position.set(0, 3.5, 0);
  g.add(head);
  sphere(head, skin, 0.235, [0, 0.02, 0], [0.8, 1.0, 0.9]);
  sphere(head, skinDk, 0.2, [0, -0.14, 0.02], [0.82, 0.86, 0.96]);
  sphere(head, skin, 0.045, [0, -0.03, 0.205], [0.9, 1.3, 1.1]);
  sphere(head, skinDk, 0.05, [0.185, -0.02, 0], [0.6, 1.1, 0.9]);
  sphere(head, skinDk, 0.05, [-0.185, -0.02, 0], [0.6, 1.1, 0.9]);
  // Ojos
  sphere(head, white, 0.032, [0.08, 0.03, 0.192], [1, 1, 0.5]);
  sphere(head, white, 0.032, [-0.08, 0.03, 0.192], [1, 1, 0.5]);
  sphere(head, dark, 0.017, [0.085, 0.03, 0.213], [1, 1, 0.6]);
  sphere(head, dark, 0.017, [-0.085, 0.03, 0.213], [1, 1, 0.6]);
  // Cejas
  box(head, dark, [0.075, 0.014, 0.02], [0.085, 0.085, 0.196], [0, 0, -0.12]);
  box(head, dark, [0.075, 0.014, 0.02], [-0.085, 0.085, 0.196], [0, 0, 0.12]);
  // Boca
  sphere(head, skinDk, 0.03, [0, -0.135, 0.16], [1.5, 0.35, 0.4]);
  // Pelo
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.248, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  cap.position.set(0, 0.035, -0.01);
  cap.scale.set(cfg.bust ? 0.84 : 0.82, 1.04, 0.96);
  head.add(cap);
  if (cfg.longHair) {
    sphere(head, hair, 0.22, [0, -0.42, -0.06], [0.98, 1.7, 0.72]);
    sphere(head, hair, 0.09, [0.2, -0.2, 0.02], [0.7, 1.8, 0.8]);
    sphere(head, hair, 0.09, [-0.2, -0.2, 0.02], [0.7, 1.8, 0.8]);
  }

  // Brazos
  for (const s of [1, -1]) {
    const shoulder: [number, number, number] = [s * sx, 3.0, 0];
    const elbow: [number, number, number] = [s * (sx + 0.06), 2.35, 0];
    const wrist: [number, number, number] = [s * (sx + 0.11), 1.72, 0];
    sphere(g, skin, cfg.deltoid, [s * (sx - 0.02), 3.0, 0], [1, 1, 0.9]);
    limb(g, skin, shoulder, elbow, cfg.upperArm[0], cfg.upperArm[1]);
    sphere(g, skin, cfg.upperArm[1] * 0.95, elbow);
    limb(g, skin, elbow, wrist, cfg.foreArm[0], cfg.foreArm[1]);
    // Mano (palma + pulgar)
    const hand = new THREE.Group();
    hand.position.set(wrist[0], wrist[1] - 0.11, 0.01);
    g.add(hand);
    sphere(hand, skinDk, 0.062, [0, 0, 0], [0.95, 1.5, 0.58]);
    sphere(hand, skinDk, 0.03, [s * 0.055, 0.02, 0.01], [0.8, 1.1, 0.8]);
  }

  // Piernas
  for (const s of [1, -1]) {
    const hip: [number, number, number] = [s * 0.16, 1.98, 0];
    const knee: [number, number, number] = [s * 0.15, 1.02, 0];
    const ankle: [number, number, number] = [s * 0.14, 0.18, 0];
    sphere(g, skin, 0.16, hip, [1, 0.9, 1]);
    limb(g, skin, hip, knee, cfg.thigh[0], cfg.thigh[1]);
    sphere(g, skin, cfg.thigh[1] * 0.95, knee);
    limb(g, skin, knee, ankle, cfg.calf[0], cfg.calf[1]);
    sphere(g, skin, cfg.calf[0] * 0.92, [s * 0.15, 0.72, -0.04], [1, 1.5, 0.9]);
    sphere(g, skinDk, 0.12, [s * 0.14, 0.09, 0.14], [1.1, 0.95, 2.6]);
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