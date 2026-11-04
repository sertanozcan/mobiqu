import { BoxPreset } from '../types';

export const BOX_PRESETS: BoxPreset[] = [
  {
    id: 'pharma-standard',
    name: 'İlaç Kutusu',
    category: 'Medikal',
    l: 70,
    w: 45,
    h: 110,
  },
  {
    id: 'pharma-vial',
    name: 'Flakon / Aşı',
    category: 'Soğuk Zincir',
    l: 45,
    w: 45,
    h: 85,
  },
  {
    id: 'pharma-sample',
    name: 'Numune Kiti',
    category: 'Teşhis',
    l: 120,
    w: 80,
    h: 35,
  },
  {
    id: 'pharma-syrup',
    name: 'Şurup Şişesi',
    category: 'Sıvı İlaç',
    l: 60,
    w: 60,
    h: 140,
  },
];
