import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getGLTFLoader, withAuthHeader } from "./loaders";
import { CHARACTER_MODELS, CHARACTER_HEIGHT, GENDER_NODE_MATCH, resolveAssetUrl } from "./config";
import type { Gender } from "./types";

export interface CharacterInstance {
  scene: THREE.Group;
  skeleton: THREE.Skeleton | null;
  rootBone: THREE.Bone | null;
  boneIndex: Map<string, THREE.Bone>;
  hasModel: boolean;
}

const gltfCache = new Map<string, Promise<THREE.Group>>();

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadGLTFScene(url: string): Promise<THREE.Group> {
  const resolved = resolveAssetUrl(url) ?? url;
  const existing = gltfCache.get(resolved);
  if (existing) return existing;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = withAuthHeader(getGLTFLoader());
    loader.load(
      resolved,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(error),
    );
  });
  gltfCache.set(resolved, promise);
  return promise;
}

// Cuando el GLB trae ambos generos, deja solo el personaje pedido.
function pruneToGender(scene: THREE.Object3D, gender: Gender) {
  const other: Gender = gender === "mujer" ? "hombre" : "mujer";
  let selected: THREE.Object3D | null = null;
  scene.traverse((o) => {
    if (selected || !o.name) return;
    if (GENDER_NODE_MATCH[gender].test(o.name)) selected = o;
  });
  const chosen = selected as THREE.Object3D | null;
  if (!chosen || !chosen.parent) return;
  const parent = chosen.parent;
  for (const child of [...parent.children]) {
    if (child === chosen) continue;
    if (GENDER_NODE_MATCH[other].test(child.name)) parent.remove(child);
  }
}

// Ajusta escala/posicion: altura objetivo, pies en y=0 y centrado en x/z.
function normalizeCharacter(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0) scene.scale.setScalar(CHARACTER_HEIGHT / size.y);
  scene.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box2.min.y;
  scene.updateMatrixWorld(true);
}

export function extractRig(scene: THREE.Object3D) {
  let skeleton: THREE.Skeleton | null = null;
  let rootBone: THREE.Bone | null = null;
  scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh & { isSkinnedMesh?: boolean };
    if (sm.isSkinnedMesh && sm.skeleton && !skeleton) skeleton = sm.skeleton;
    const bone = o as THREE.Bone & { isBone?: boolean };
    if (bone.isBone && !rootBone) rootBone = bone;
  });
  const boneIndex = new Map<string, THREE.Bone>();
  const bones: THREE.Bone[] = skeleton ? (skeleton as THREE.Skeleton).bones : [];
  for (const b of bones) boneIndex.set(normalizeName(b.name), b);
  return { skeleton, rootBone, boneIndex };
}

export async function loadCharacter(gender: Gender): Promise<CharacterInstance> {
  const source = await loadGLTFScene(CHARACTER_MODELS[gender]);
  const scene = cloneSkeleton(source) as THREE.Group;
  pruneToGender(scene, gender);
  normalizeCharacter(scene);
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as THREE.Mesh & { isMesh?: boolean }).isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const applyEnv = (m: THREE.Material) => {
      const std = m as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial) return;
      std.envMapIntensity = 0.7;
      if (!std.map && /grey|gray|skin|body/i.test(m.name || "")) {
        std.color = new THREE.Color(0xd9b39a);
        std.roughness = 0.72;
        std.metalness = 0;
      }
    };
    if (Array.isArray(mesh.material)) mesh.material.forEach(applyEnv);
    else if (mesh.material) applyEnv(mesh.material);
  });
  const rig = extractRig(scene);
  return { scene, hasModel: true, ...rig };
}

// Personaje inexistente: silueta neutra manejada por la UI (sin primitivas 3D).
export function emptyCharacter(): CharacterInstance {
  return {
    scene: new THREE.Group(),
    skeleton: null,
    rootBone: null,
    boneIndex: new Map(),
    hasModel: false,
  };
}
