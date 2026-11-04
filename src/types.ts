export interface Product {
  name: string;
  l: number;
  w: number;
  h: number;
}

export type TempRange = '+2/+8' | '-25/-15' | '+15/+25';

export type RotationMode = 'z' | 'free';

export interface Placement {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  index?: number;
  layerIndex?: number;
}

export interface Orientation {
  dx: number;
  dy: number;
  dz: number;
}

export interface LayerInfo {
  layerIndex: number; // 1-based (Kat 1, Kat 2...)
  minZ: number;
  maxZ: number;
  height: number;
  placements: Placement[];
  boxCount: number;
  startIndex: number;
  endIndex: number;
}

export interface PackResult {
  count: number;
  placements: Placement[];
  sortedPlacements: Placement[];
  layers: LayerInfo[];
  usedVolume: number;
  containerVolume: number;
  efficiency: number;
  leftoverVolume: number;
}

export interface OrientationSummary {
  key: string;
  count: number;
  dx: number;
  dy: number;
  dz: number;
  color: string;
  percentage: number;
}

export interface BoxPreset {
  id: string;
  name: string;
  category: string;
  l: number;
  w: number;
  h: number;
}
