import { Orientation, Placement, RotationMode, PackResult, OrientationSummary, LayerInfo, PaletteMode } from '../types';

export const EPS = 1e-6;

// Curated palettes ensuring maximum visual distinction and zero hue collision
export const CURATED_PALETTE_SETS: Record<PaletteMode, string[][]> = {
  vibrant: [
    ['#0284c7', '#d97706', '#0d9488', '#8b5cf6', '#e11d48', '#16a34a'],
    ['#2563eb', '#ea580c', '#059669', '#7c3aed', '#db2777', '#ca8a04'],
    ['#06b6d4', '#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#84cc16'],
    ['#0284c7', '#f97316', '#14b8a6', '#a855f7', '#e11d48', '#eab308'],
  ],
  pastel: [
    ['#7dd3fc', '#fdba74', '#86efac', '#c084fc', '#f472b6', '#fde047'],
    ['#67e8f9', '#fca5a5', '#a7f3d0', '#d8b4fe', '#f9a8d4', '#fef08a'],
    ['#93c5fd', '#fed7aa', '#6ee7b7', '#e879f9', '#fb7185', '#fef9c3'],
    ['#38bdf8', '#fb923c', '#4ade80', '#a78bfa', '#ec4899', '#facc15'],
  ],
  monochrome: [
    ['#1e293b', '#64748b', '#cbd5e1', '#475569', '#94a3b8', '#e2e8f0'],
    ['#18181b', '#71717a', '#d4d4d8', '#3f3f46', '#a1a1aa', '#e4e4e7'],
    ['#111827', '#6b7280', '#d1d5db', '#374151', '#9ca3af', '#e5e7eb'],
    ['#0f172a', '#475569', '#94a3b8', '#334155', '#cbd5e1', '#f1f5f9'],
  ],
};

export const COLOR_PALETTES: Record<PaletteMode, string[]> = {
  vibrant: CURATED_PALETTE_SETS.vibrant[0],
  pastel: CURATED_PALETTE_SETS.pastel[0],
  monochrome: CURATED_PALETTE_SETS.monochrome[0],
};

export const PALETTE = CURATED_PALETTE_SETS.vibrant[0];

export function dedupeOrientations(list: Orientation[]): Orientation[] {
  const seen = new Set<string>();
  const out: Orientation[] = [];
  for (const o of list) {
    const key = `${o.dx.toFixed(6)}_${o.dy.toFixed(6)}_${o.dz.toFixed(6)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(o);
    }
  }
  return out;
}

export function getOrientations(l: number, w: number, h: number, mode: RotationMode): Orientation[] {
  if (mode === 'z') {
    return dedupeOrientations([
      { dx: l, dy: w, dz: h },
      { dx: w, dy: l, dz: h },
    ]);
  }
  const p: Orientation[] = [
    { dx: l, dy: w, dz: h },
    { dx: l, dy: h, dz: w },
    { dx: w, dy: l, dz: h },
    { dx: w, dy: h, dz: l },
    { dx: h, dy: l, dz: w },
    { dx: h, dy: w, dz: l },
  ];
  return dedupeOrientations(p);
}

interface RawSolveResult {
  count: number;
  placements: Placement[];
}

export function solveBin(
  L: number,
  W: number,
  H: number,
  depth: number,
  orientations: Orientation[],
  memo: Map<string, RawSolveResult>
): RawSolveResult {
  if (depth <= 0 || L <= EPS || W <= EPS || H <= EPS) {
    return { count: 0, placements: [] };
  }

  const key = `${L.toFixed(3)}|${W.toFixed(3)}|${H.toFixed(3)}|${depth}`;
  const cached = memo.get(key);
  if (cached) return cached;

  let best: RawSolveResult = { count: 0, placements: [] };

  for (const o of orientations) {
    const nx = Math.floor((L + EPS) / o.dx);
    const ny = Math.floor((W + EPS) / o.dy);
    const nz = Math.floor((H + EPS) / o.dz);
    if (nx <= 0 || ny <= 0 || nz <= 0) continue;

    const usedX = nx * o.dx;
    const usedY = ny * o.dy;
    const usedZ = nz * o.dz;
    const gridCount = nx * ny * nz;
    const gridPlacements: Placement[] = [];

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          gridPlacements.push({
            x: i * o.dx,
            y: j * o.dy,
            z: k * o.dz,
            dx: o.dx,
            dy: o.dy,
            dz: o.dz,
          });
        }
      }
    }

    const remX = L - usedX;
    const remY = W - usedY;
    const remZ = H - usedZ;
    let subCount = 0;
    const subPlacements: Placement[] = [];

    if (remX > EPS) {
      const r = solveBin(remX, W, H, depth - 1, orientations, memo);
      subCount += r.count;
      subPlacements.push(...r.placements.map((p) => ({ ...p, x: p.x + usedX })));
    }
    if (remY > EPS) {
      const r = solveBin(usedX, remY, H, depth - 1, orientations, memo);
      subCount += r.count;
      subPlacements.push(...r.placements.map((p) => ({ ...p, y: p.y + usedY })));
    }
    if (remZ > EPS) {
      const r = solveBin(usedX, usedY, remZ, depth - 1, orientations, memo);
      subCount += r.count;
      subPlacements.push(...r.placements.map((p) => ({ ...p, z: p.z + usedZ })));
    }

    const total = gridCount + subCount;
    if (total > best.count) {
      best = { count: total, placements: gridPlacements.concat(subPlacements) };
    }
  }

  memo.set(key, best);
  return best;
}

export function sortPlacementsForLoading(placements: Placement[]): Placement[] {
  return [...placements].sort((a, b) => {
    // 1. Sort by base height Z (bottom to top)
    if (Math.abs(a.z - b.z) > 0.01) {
      return a.z - b.z;
    }
    // 2. Sort by Y (back to front)
    if (Math.abs(a.y - b.y) > 0.01) {
      return a.y - b.y;
    }
    // 3. Sort by X (left to right)
    return a.x - b.x;
  });
}

export function groupPlacementsIntoLayers(sortedPlacements: Placement[]): LayerInfo[] {
  if (sortedPlacements.length === 0) return [];

  const layers: LayerInfo[] = [];
  let currentLayerPlacements: Placement[] = [];
  let currentBaseZ = sortedPlacements[0].z;
  let startIndex = 0;

  sortedPlacements.forEach((p, idx) => {
    // Group boxes on approximately the same Z baseline (within 1mm threshold)
    if (Math.abs(p.z - currentBaseZ) <= 1.0) {
      currentLayerPlacements.push({ ...p, index: idx + 1 });
    } else {
      const minZ = currentBaseZ;
      const maxZ = Math.max(...currentLayerPlacements.map((item) => item.z + item.dz));
      const layerIdx = layers.length + 1;

      layers.push({
        layerIndex: layerIdx,
        minZ,
        maxZ,
        height: maxZ - minZ,
        placements: currentLayerPlacements.map((item) => ({ ...item, layerIndex: layerIdx })),
        boxCount: currentLayerPlacements.length,
        startIndex,
        endIndex: idx - 1,
      });

      currentBaseZ = p.z;
      startIndex = idx;
      currentLayerPlacements = [{ ...p, index: idx + 1 }];
    }
  });

  if (currentLayerPlacements.length > 0) {
    const minZ = currentBaseZ;
    const maxZ = Math.max(...currentLayerPlacements.map((item) => item.z + item.dz));
    const layerIdx = layers.length + 1;
    layers.push({
      layerIndex: layerIdx,
      minZ,
      maxZ,
      height: maxZ - minZ,
      placements: currentLayerPlacements.map((item) => ({ ...item, layerIndex: layerIdx })),
      boxCount: currentLayerPlacements.length,
      startIndex,
      endIndex: sortedPlacements.length - 1,
    });
  }

  return layers;
}

export function computePacking(
  L: number,
  W: number,
  H: number,
  l: number,
  w: number,
  h: number,
  mode: RotationMode
): PackResult {
  const orientations = getOrientations(l, w, h, mode);
  const memo = new Map<string, RawSolveResult>();
  const raw = solveBin(L, W, H, 5, orientations, memo);

  const boxVol = l * w * h;
  const contVol = L * W * H;
  const usedVol = raw.count * boxVol;
  const eff = contVol > 0 ? (usedVol / contVol) * 100 : 0;
  const leftoverVol = Math.max(0, contVol - usedVol);

  const sorted = sortPlacementsForLoading(raw.placements);
  const layers = groupPlacementsIntoLayers(sorted);

  // Flatten with layer indices stamped
  const enrichedSorted: Placement[] = [];
  layers.forEach((layer) => {
    enrichedSorted.push(...layer.placements);
  });

  return {
    count: raw.count,
    placements: raw.placements,
    sortedPlacements: enrichedSorted.length > 0 ? enrichedSorted : sorted,
    layers,
    usedVolume: usedVol,
    containerVolume: contVol,
    efficiency: eff,
    leftoverVolume: leftoverVol,
  };
}

export function buildOrientationSummaries(
  placements: Placement[],
  paletteMode: PaletteMode = 'vibrant',
  variationSeed: number = 0
): OrientationSummary[] {
  const orientCounts: Record<string, { count: number; dx: number; dy: number; dz: number }> = {};
  for (const p of placements) {
    const key = `${p.dx.toFixed(3)}_${p.dy.toFixed(3)}_${p.dz.toFixed(3)}`;
    if (!orientCounts[key]) {
      orientCounts[key] = { count: 0, dx: p.dx, dy: p.dy, dz: p.dz };
    }
    orientCounts[key].count++;
  }

  const variations = CURATED_PALETTE_SETS[paletteMode] || CURATED_PALETTE_SETS.vibrant;
  const activeSet = variations[variationSeed % variations.length];
  const total = placements.length;
  const keys = Object.keys(orientCounts);
  return keys.map((key, i) => {
    const item = orientCounts[key];
    return {
      key,
      count: item.count,
      dx: item.dx,
      dy: item.dy,
      dz: item.dz,
      color: activeSet[i % activeSet.length],
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    };
  });
}

export function formatNumber(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: decimals });
}

export function toLiters(mm3: number): string {
  if (!Number.isFinite(mm3)) return '—';
  const liters = mm3 / 1_000_000;
  return liters.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' L';
}
