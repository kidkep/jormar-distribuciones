import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getGLTFLoader, withAuthHeader } from "./loaders";
import { resolveAssetUrl } from "./config";
import { normalizeName, type CharacterInstance } from "./characterLoader";
import { sizeFactor } from "../mannequinModel";

const cache = new Map<string, Promise<THREE.Object3D>>();

function loadGarmentScene(url: string): Promise<THREE.Object3D> {
  const resolved = resolveAssetUrl(url) ?? url;
  const existing = cache.get(resolved);
  if (existing) return existing;
  const promise = new Promise<THREE.Object3D>((resolve, reject) => {
    const loader = withAuthHeader(getGLTFLoader());
    loader.load(
      resolved,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(error),
    );
  });
  cache.set(resolved, promise);
  return promise;
}

function cloneMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as THREE.Mesh & { isMesh?: boolean }).isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
  });
}

// Reasocia las mallas skinned al esqueleto del personaje para que sigan su pose.
function rebindToCharacter(root: THREE.Object3D, character: CharacterInstance) {
  if (!character.skeleton || character.boneIndex.size === 0) return;
  root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh & { isSkinnedMesh?: boolean };
    if (!sm.isSkinnedMesh || !sm.skeleton) return;
    const mapped = sm.skeleton.bones.map(
      (bone) => character.boneIndex.get(normalizeName(bone.name)) ?? bone,
    );
    sm.skeleton = new THREE.Skeleton(mapped, sm.skeleton.boneInverses);
    sm.bind(sm.skeleton, sm.bindMatrix);
  });
}

function applyTint(root: THREE.Object3D, hex?: string) {
  if (!hex) return;
  const color = new THREE.Color(hex);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as THREE.Mesh & { isMesh?: boolean }).isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of list) {
      const std = m as THREE.MeshStandardMaterial;
      if (std.color) std.color.copy(color);
    }
  });
}

export interface GarmentOptions {
  character: CharacterInstance;
  size?: string;
  color?: string;
}

export async function instantiateGarment(url: string, opts: GarmentOptions): Promise<THREE.Object3D> {
  const source = await loadGarmentScene(url);
  const object = cloneSkeleton(source) as THREE.Object3D;
  cloneMaterials(object);
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if ((mesh as THREE.Mesh & { isMesh?: boolean }).isMesh) mesh.castShadow = true;
  });
  rebindToCharacter(object, opts.character);
  applyTint(object, opts.color);
  const factor = sizeFactor(opts.size);
  object.scale.set(factor, 1, factor);
  return object;
}

// Las geometrias/texturas viven en cache: solo liberamos los materiales clonados.
export function disposeGarment(object: THREE.Object3D) {
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as THREE.Mesh & { isMesh?: boolean }).isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    list.forEach((m) => m.dispose());
  });
}
