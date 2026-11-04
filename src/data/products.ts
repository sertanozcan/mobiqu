import { Product, TempRange } from '../types';

// Outer box product catalog (mm)
// Dimensions unaffected by the selected temperature range
export const PRODUCTS_FIXED: Product[] = [
  { name: 'Multi-4',    l: 160, w: 160, h: 160 },
  { name: 'Multi-12',   l: 270, w: 270, h: 170 },
  { name: 'Multi-28',   l: 305, w: 305, h: 305 },
  { name: 'Multi4E',    l: 145, w: 145, h: 145 },
  { name: 'Multi-12E',  l: 220, w: 220, h: 220 },
  { name: 'Multi-28E',  l: 300, w: 300, h: 285 },
  { name: 'Multi-42E',  l: 460, w: 305, h: 290 },
  { name: 'Single-4',   l: 152, w: 152, h: 152 },
  { name: 'Single-12',  l: 263, w: 263, h: 162 },
  { name: 'Single-24',  l: 287, w: 287, h: 287 },
  { name: 'Single-4P',  l: 155, w: 155, h: 145 },
  { name: 'Single-12P', l: 225, w: 225, h: 215 },
  { name: 'Single-4V',  l: 145, w: 145, h: 145 },
  { name: 'Single-12V', l: 220, w: 220, h: 218 },
  { name: 'Single-28V', l: 295, w: 295, h: 285 },
  { name: 'Single-42V', l: 460, w: 305, h: 290 },
];

// Dimensions that change depending on the selected temperature range
export const PRODUCTS_TEMP: Record<TempRange, Product[]> = {
  '+2/+8': [
    { name: 'Single-28P', l: 300, w: 300, h: 300 },
    { name: 'Single-56P', l: 375, w: 375, h: 375 },
    { name: 'Single-72P', l: 500, w: 375, h: 375 },
  ],
  '-25/-15': [
    { name: 'Single-28P', l: 300, w: 300, h: 300 },
    { name: 'Single-56P', l: 375, w: 375, h: 375 },
    { name: 'Single-72P', l: 500, w: 375, h: 375 },
  ],
  '+15/+25': [
    { name: 'Single-28P', l: 320, w: 320, h: 320 },
    { name: 'Single-56P', l: 395, w: 375, h: 395 },
    { name: 'Single-72P', l: 520, w: 395, h: 395 },
  ],
};
