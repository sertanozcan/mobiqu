import { BoxPreset } from '../types';

export const BOX_PRESETS: BoxPreset[] = [
  {
    id: 'pharma-standard',
    name: 'İlaç Kutusu',
    nameEn: 'Medicine Box',
    category: 'Medikal',
    categoryEn: 'Medical',
    l: 70,
    w: 45,
    h: 110,
  },
  {
    id: 'pharma-vial',
    name: 'Flakon / Aşı',
    nameEn: 'Vial / Vaccine',
    category: 'Soğuk Zincir',
    categoryEn: 'Cold Chain',
    l: 45,
    w: 45,
    h: 85,
  },
  {
    id: 'pharma-sample',
    name: 'Numune Kiti',
    nameEn: 'Sample Kit',
    category: 'Teşhis',
    categoryEn: 'Diagnostic',
    l: 120,
    w: 80,
    h: 35,
  },
  {
    id: 'pharma-syrup',
    name: 'Şurup Şişesi',
    nameEn: 'Syrup Bottle',
    category: 'Sıvı İlaç',
    categoryEn: 'Liquid Medicine',
    l: 60,
    w: 60,
    h: 140,
  },
];
