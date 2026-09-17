import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
    side: THREE.DoubleSide,
    ...opts,
  });
}

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number],
  scale?: [number, number, number],
  rot?: [number, number, number],
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(pos[0], pos[1], pos[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  group.add(m);
  return m;
}

function sphere(
  group: THREE.Group,
  material: THREE.Material,
  r: number,
  pos: [number, number, number],
  scale?: [number, number, number],
) {
  return addMesh(group, new THREE.SphereGeometry(r, 32, 24), material, pos, scale);
}

function box(
  group: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  pos: [number, number, number],
) {
  return addMesh(group, new THREE.BoxGeometry(size[0], size[1], size[2]), material, pos);
}

function limb(
  group: THREE.Group,
  material: THREE.Material,
  a: [number, number, number],
  b: [number, number, number],
  rStart: number,
  rEnd: number,
) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(rEnd, rStart, len, 20, 1, false);
  const m = new THREE.Mesh(geo, material);
  m.position.copy(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  group.add(m);
  return m;
}

function lathe(
  group: THREE.Group,
  material: THREE.Material,
  points: [number, number][],
  zScale = 0.63,
) {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(vecs, 40), material);
  m.scale.set(1, 1, zScale);
  group.add(m);
  return m;
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

// Perfil lateral del torso (radio, altura). Se gira con LatheGeometry.
const TORSO_PROFILE: [number, number][] = [
  [0.285, 1.98],
  [0.315, 2.1],
  [0.295, 2.3],
  [0.262, 2.46],
  [0.285, 2.6],
  [0.325, 2.76],
  [0.335, 2.9],
  [0.31, 3.0],
  [0.2, 3.07],
];

export function createBody(): THREE.Group {
  const g = new THREE.Group();
  const skin = mat(0xe4a97e, { roughness: 0.62 });
  const skinDk = mat(0xd0966b, { roughness: 0.66 });
  const hair = mat(0x2a2118, { roughness: 0.9, metalness: 0 });
  const dark = mat(0x1c1713, { roughness: 0.4 });

  // Cuello
  limb(g, skin, [0, 2.96, 0], [0, 3.32, 0], 0.125, 0.095);
  // Trapecio / hombros
  sphere(g, skin, 0.2, [0, 2.98, 0], [1.7, 0.55, 0.85]);

  // Torso
  lathe(g, skin, TORSO_PROFILE, 0.62);
  sphere(g, skin, 0.29, [0, 2.06, 0], [1.0, 0.82, 0.62]);

  // Pecho
  sphere(g, skin, 0.13, [0.15, 2.72, 0.17], [1.1, 0.85, 0.7]);
  sphere(g, skin, 0.13, [-0.15, 2.72, 0.17], [1.1, 0.85, 0.7]);

  // Cabeza
  const head = new THREE.Group();
  head.position.set(0, 3.5, 0);
  g.add(head);
  sphere(head, skin, 0.235, [0, 0.02, 0], [0.8, 1.0, 0.9]);
  sphere(head, skinDk, 0.2, [0, -0.14, 0.02], [0.82, 0.86, 0.96]);
  // Nariz
  sphere(head, skin, 0.045, [0, -0.03, 0.205], [0.9, 1.3, 1.1]);
  // Orejas
  sphere(head, skinDk, 0.05, [0.185, -0.02, 0], [0.6, 1.1, 0.9]);
  sphere(head, skinDk, 0.05, [-0.185, -0.02, 0], [0.6, 1.1, 0.9]);
  // Ojos
  sphere(head, dark, 0.026, [0.08, 0.03, 0.195], [1, 1, 0.6]);
  sphere(head, dark, 0.026, [-0.08, 0.03, 0.195], [1, 1, 0.6]);
  // Pelo
  const hairGeo = new THREE.SphereGeometry(0.248, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const hairMesh = new THREE.Mesh(hairGeo, hair);
  hairMesh.position.set(0, 0.03, -0.01);
  hairMesh.scale.set(0.82, 1.02, 0.94);
  head.add(hairMesh);

  // Brazos
  for (const s of [1, -1]) {
    sphere(g, skin, 0.14, [s * 0.42, 3.0, 0], [1, 1, 0.9]);
    limb(g, skin, [s * 0.44, 3.0, 0], [s * 0.5, 2.35, 0], 0.115, 0.088);
    sphere(g, skin, 0.085, [s * 0.5, 2.34, 0]);
    limb(g, skin, [s * 0.5, 2.34, 0], [s * 0.55, 1.72, 0], 0.09, 0.062);
    sphere(g, skinDk, 0.075, [s * 0.57, 1.6, 0.01], [0.85, 1.6, 0.55]);
  }

  // Piernas
  for (const s of [1, -1]) {
    sphere(g, skin, 0.16, [s * 0.16, 1.98, 0], [1, 0.9, 1]);
    limb(g, skin, [s * 0.16, 1.98, 0], [s * 0.15, 1.02, 0], 0.17, 0.115);
    sphere(g, skin, 0.11, [s * 0.15, 1.02, 0]);
    limb(g, skin, [s * 0.15, 1.02, 0], [s * 0.14, 0.18, 0], 0.125, 0.068);
    // Gemelo
    sphere(g, skin, 0.115, [s * 0.15, 0.72, -0.04], [1, 1.5, 0.9]);
    // Pie
    sphere(g, skinDk, 0.12, [s * 0.14, 0.09, 0.14], [1.1, 0.95, 2.6]);
  }

  // Anillo dorado de base
  const gold = mat(0xc79a32, { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 12, 64), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.015;
  g.add(ring);

  return g;
}

export function createGarment(type: string, factor: number, colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const fabric = mat(colorHex, { roughness: 0.82, side: THREE.DoubleSide });
  const darkHex = new THREE.Color(colorHex).multiplyScalar(0.78).getHex();
  const fabricDk = mat(darkHex, { roughness: 0.85, side: THREE.DoubleSide });
  const z = 0.63;

  const torsoTop = (hemY: number, radiusBoost = 0) => {
    const b = radiusBoost;
    const pts: [number, number][] = [
      [0.335 + b, hemY],
      [0.325 + b, hemY + 0.16],
      [0.3 + b, 2.42],
      [0.34 + b, 2.62],
      [0.375 + b, 2.79],
      [0.385 + b, 2.92],
      [0.355 + b, 3.02],
      [0.255 + b, 3.07],
    ];
    lathe(g, fabric, pts, z);
  };

  const collar = () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.036, 12, 32), fabricDk);
    m.position.set(0, 3.02, 0.01);
    m.rotation.x = Math.PI / 2;
    m.scale.set(1, 0.62, 1);
    g.add(m);
  };

  const sleeve = (long: boolean) => {
    if (long) {
      limb(g, fabric, [0.43, 2.98, 0], [0.55, 1.76, 0], 0.15, 0.07);
      limb(g, fabric, [-0.43, 2.98, 0], [-0.55, 1.76, 0], 0.15, 0.07);
    } else {
      limb(g, fabric, [0.44, 3.0, 0], [0.51, 2.6, 0], 0.155, 0.12);
      limb(g, fabric, [-0.44, 3.0, 0], [-0.51, 2.6, 0], 0.155, 0.12);
    }
  };

  const hood = () => {
    sphere(g, fabricDk, 0.19, [0, 3.0, -0.17], [1.15, 0.95, 0.9]);
  };

  const pants = () => {
    sphere(g, fabric, 0.33, [0, 2.08, 0], [1.02, 0.82, 0.63]);
    for (const s of [1, -1]) {
      limb(g, fabric, [s * 0.16, 2.06, 0], [s * 0.15, 1.0, 0], 0.205, 0.145);
      limb(g, fabric, [s * 0.15, 1.0, 0], [s * 0.14, 0.16, 0], 0.16, 0.095);
    }
  };

  const shoes = () => {
    for (const s of [1, -1]) {
      sphere(g, fabric, 0.135, [s * 0.15, 0.11, 0.16], [1.15, 0.98, 2.6]);
      box(g, fabricDk, [0.36, 0.06, 0.74], [s * 0.15, 0.03, 0.16]);
    }
  };

  const helmet = () => {
    const dome = new THREE.SphereGeometry(0.33, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const m = new THREE.Mesh(dome, fabric);
    m.position.set(0, 3.44, 0);
    m.scale.set(0.92, 1.0, 0.98);
    g.add(m);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 12, 40), fabricDk);
    brim.rotation.x = Math.PI / 2;
    brim.position.set(0, 3.43, 0.03);
    brim.scale.set(1, 0.98, 1);
    g.add(brim);
  };

  const gloves = () => {
    for (const s of [1, -1]) {
      sphere(g, fabric, 0.085, [s * 0.57, 1.61, 0.01], [0.95, 1.6, 0.62]);
    }
  };

  switch (type) {
    case "camiseta":
      torsoTop(2.12);
      sleeve(false);
      collar();
      break;
    case "camisa":
      torsoTop(2.04);
      sleeve(true);
      collar();
      break;
    case "buso":
      torsoTop(2.02, 0.02);
      sleeve(true);
      hood();
      collar();
      break;
    case "chaqueta":
      torsoTop(2.0, 0.03);
      sleeve(true);
      collar();
      break;
    case "chaleco":
      torsoTop(1.98, 0.02);
      collar();
      break;
    case "overol":
      torsoTop(2.32);
      pants();
      sleeve(true);
      collar();
      break;
    case "pantalon":
      pants();
      break;
    case "calzado":
      shoes();
      break;
    case "casco":
      helmet();
      break;
    case "guante":
      gloves();
      break;
    default:
      torsoTop(2.14);
      sleeve(false);
      collar();
  }

  g.scale.set(factor, 1, factor);
  return g;
}
