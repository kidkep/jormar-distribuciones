export type Gender = "hombre" | "mujer";
export type ViewName = "front" | "back" | "left" | "right" | "three";
export type BackgroundName = "studio" | "white" | "gray" | "dark";

export interface FittingItem {
  key: string;
  product_id?: number;
  type: string;
  layer?: string | null;
  size: string;
  color: string;
  modelUrl?: string | null;
  hasModel?: boolean;
}
