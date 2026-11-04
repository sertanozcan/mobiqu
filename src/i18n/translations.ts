import { Language } from '../types';

export const translations = {
  tr: {
    appTitle: 'MOBIQU',
    appBadge: '3D Yükleme & Kat Planı',
    appSubtitle: 'Sıcaklık Kontrollü Hacim & Kat Kat Paketleme Simülatörü',
    step1Nav: '1. Konteyner',
    step2Nav: '2. Kutu Boyutu',
    step3Nav: '3. Yükleme Animasyonu',
    quickDemo: 'Hızlı Örnek',
    quickDemoTitle: 'Standart bir örnek konfigürasyon yükler',
    pdfExport: 'Kat Planı PDF',
    videoExport: 'Video İndir',
    videoRecording: 'Kaydediliyor',
    themeLight: 'Aydınlık moda geç',
    themeDark: 'Karanlık moda geç',
    themeLightText: 'Açık Tema',
    themeDarkText: 'Koyu Tema',

    // Control Panel
    step1Title: 'Dış Yük Hacmi (Konteyner)',
    tempRangeLabel: 'Sıcaklık Aralığı',
    tempCold: 'Soğuk Zincir',
    tempFrozen: 'Donuk',
    tempRoom: 'Oda Sıcaklığı',
    modelLabel: 'Mobiqu Konteyner Modeli',
    modelPlaceholderSelectTemp: 'Önce sıcaklık aralığı seçin',
    modelPlaceholderSelectModel: 'Konteyner modeli seçin...',
    groupStandard: 'Standart Modeller (Sabit)',
    groupTempSpecific: (range: string) => `${range} Modelleri`,
    containerInnerVolume: 'Konteyner İç Hacmi',
    lengthLabel: 'Uzunluk (L)',
    widthLabel: 'Genişlik (W)',
    heightLabel: 'Yükseklik (H)',

    step2Title: 'Paketlenecek İç Kutu',
    perBoxVolume: 'kutu',
    quickPresets: 'Hızlı Örnek Ölçüler:',
    innerLengthLabel: 'Uzunluk (l)',
    innerWidthLabel: 'Genişlik (w)',
    innerHeightLabel: 'Yükseklik (h)',

    step3Title: 'Döndürme İzni',
    rotZTitle: 'Sadece Dikey (Z) Ekseni',
    rotZDesc: 'Yükseklik yönü sabit kalır. Sıvı ilaç, flakon ve dik durması gereken yükler için güvenlidir.',
    rotFreeTitle: '3 Eksen Serbest (90°)',
    rotFreeDesc: 'Herhangi bir yüz tabana gelebilir. Maksimum doluluk oranı için tüm 6 yön denenir.',
    calculateBtn: 'Yerleşimi Hesapla',

    warnInvalid: 'Lütfen sıcaklık aralığı ve konteyner modeli seçin, ardından kutu ölçülerini pozitif sayılarla girin.',
    warnNoFit: 'Bu ölçülerle konteyner içine kutu sığmıyor. Lütfen kutu boyutlarını veya döndürme iznini kontrol edin.',

    // Viewport HUD
    hudLoadedBoxes: 'Yüklenen Kutu',
    hudTotalBoxes: 'adet',
    hudLayer: 'Kat',
    hudEfficiency: 'Doluluk Oranı',
    hudFilledVol: 'Dolu Hacim',
    hudEmptyVol: 'Kalan Boş',

    // Viewport Empty State
    emptyTitle: '3D Yük Yerleşim Simülatörü',
    emptyDesc: 'Sol menüden konteyner ve kutu ölçülerini seçin, kat kat yükleme animasyonunu izleyin ve PDF / Video olarak dışa aktarın.',
    emptyBtn: 'Hızlı Örneği Yükle & Başlat',

    // Environment & Viewport Controls
    envButton: 'Çevre',
    envGrid: 'Izgara (Grid)',
    envPhotobooth: 'Photo Booth (Stüdyo)',
    shadowsButton: 'Obje Gölgesi',
    ambientButton: 'Ortam Işığı',
    reflectionButton: 'Işık Yansıması',
    paletteButton: 'Renk Paleti',
    paletteVibrant: 'Canlı Renkler',
    palettePastel: 'Pastel Tonlar',
    paletteMonochrome: 'Gri Tonları',
    shuffleColors: 'Farklı Renkler',
    shuffleColorsDesc: 'Seçili palet içinden farklı renk tonları seçer',
    on: 'Açık',
    off: 'Kapalı',
    view3D: '3D',
    viewTop: 'Üst',
    viewFront: 'Ön',
    viewReset: 'Kamerayı Sıfırla',

    // Animation Player
    animPlay: 'Animasyonu Oynat',
    animPause: 'Animasyonu Duraklat',
    animRewind: 'Başa Sar',
    animStepBack: 'Bir Kutu Geri',
    animStepForward: 'Bir Kutu İleri',
    animFinish: 'Bitir',
    layersLabel: 'Katlar:',
    orientationsLabel: 'Yönelimler:',
    noPlacement: 'Uygun yerleşim bulunamadı',
    orderTip: 'Kutu sırası: Taban Kat 1\'den başlayıp tavana doğru kademelendirilir',

    // Notices
    layerCompletedNotice: (layerIdx: number, boxCount: number, nextLayerIdx?: number) =>
      nextLayerIdx
        ? `✓ Kat ${layerIdx} Tamamlandı (${boxCount} Kutu) — Kat ${nextLayerIdx}'ye Geçiliyor`
        : `✓ Son Kat (Kat ${layerIdx}) Tamamlandı! Toplam kutular yerleştirildi.`,
    allCompletedNotice: (total: number) => `🎉 Tüm Yükleme Tamamlandı! (${total} Kutu)`,
    videoRecordingModalTitle: 'Yükleme Animasyonu Kaydediliyor',
    videoRecordingModalDesc: 'Kutular sırayla kat kat yüklenirken 3D WebGL sahnesi video dosyası olarak yakalanıyor.',
    highCountModalTitle: 'Yüksek Kutu Sayısı Uyarısı',
    highCountModalDesc: (count: number) =>
      `Hesaplanan kutu sayısı 1.000 adedin üzerindedir (${count.toLocaleString('tr-TR')} kutu). 1.000 kutu üzerinde 3D render ve animasyon performansında yavaşlama oluşabilir. Yine de hesaplamak istediğinize emin misiniz?`,
    highCountModalConfirm: 'Evet, Hesapla & Oluştur',
    highCountModalCancel: 'İptal Et',

    // 3D Orientation Previews Drawer
    orientationsDetailTitle: 'Kutu Yönelim Detayları & 3D İzometrik Görünümler',
    orientationsDetailDesc: 'Her kutu yönelimi için ana renderdaki renkte, gerçek boyutta ve duruş açısında statik 3D izometrik referans modeli.',
    expandOrientations: '3D Modelleri Göster',
    collapseOrientations: '3D Modelleri Gizle',
    orientationItem: (idx: number) => `Yönelim ${idx}`,
    dimWidthX: 'Genişlik (X):',
    dimDepthY: 'Derinlik (Y):',
    dimHeightZ: 'Yükseklik (Z):',
    singleBoxVolLabel: 'Kutu Hacmi:',
  },
  en: {
    appTitle: 'MOBIQU',
    appBadge: '3D Packing & Layer Plan',
    appSubtitle: 'Thermal Container 3D Volume & Layer-by-Layer Packing Simulator',
    step1Nav: '1. Container',
    step2Nav: '2. Box Sizing',
    step3Nav: '3. Packing Animation',
    quickDemo: 'Quick Demo',
    quickDemoTitle: 'Loads a standard sample configuration',
    pdfExport: 'Layer Plan PDF',
    videoExport: 'Export Video',
    videoRecording: 'Recording',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    themeLightText: 'Light Mode',
    themeDarkText: 'Dark Mode',

    // Control Panel
    step1Title: 'Outer Container Volume',
    tempRangeLabel: 'Temperature Range',
    tempCold: 'Cold Chain',
    tempFrozen: 'Frozen',
    tempRoom: 'Controlled Room',
    modelLabel: 'Mobiqu Container Model',
    modelPlaceholderSelectTemp: 'Select temperature range first',
    modelPlaceholderSelectModel: 'Select container model...',
    groupStandard: 'Standard Models (Fixed)',
    groupTempSpecific: (range: string) => `${range} Models`,
    containerInnerVolume: 'Container Internal Volume',
    lengthLabel: 'Length (L)',
    widthLabel: 'Width (W)',
    heightLabel: 'Height (H)',

    step2Title: 'Inner Box Dimensions',
    perBoxVolume: 'box',
    quickPresets: 'Quick Dimension Presets:',
    innerLengthLabel: 'Length (l)',
    innerWidthLabel: 'Width (w)',
    innerHeightLabel: 'Height (h)',

    step3Title: 'Rotation Constraints',
    rotZTitle: 'Vertical (Z) Axis Only',
    rotZDesc: 'Height stays upright. Safe for liquid medicines, vials, and upright cargo.',
    rotFreeTitle: 'Free 3-Axis Rotation (90°)',
    rotFreeDesc: 'Any face can lay on the floor. Explores all 6 orthogonal orientations for maximum fill.',
    calculateBtn: 'Calculate Packing',

    warnInvalid: 'Please select temperature range and container model, then fill box dimensions with positive numbers.',
    warnNoFit: 'No boxes fit into the container with these dimensions. Check box sizing or rotation constraints.',

    // Viewport HUD
    hudLoadedBoxes: 'Loaded Boxes',
    hudTotalBoxes: 'units',
    hudLayer: 'Layer',
    hudEfficiency: 'Fill Efficiency',
    hudFilledVol: 'Filled Volume',
    hudEmptyVol: 'Unused Volume',

    // Viewport Empty State
    emptyTitle: '3D Packing Simulator',
    emptyDesc: 'Configure container and box dimensions on the left panel, watch the step-by-step 3D packing animation, and export PDF / Video reports.',
    emptyBtn: 'Load Sample & Run',

    // Environment & Viewport Controls
    envButton: 'Environment',
    envGrid: 'Grid',
    envPhotobooth: 'Photo Booth (Studio)',
    shadowsButton: 'Object Shadows',
    ambientButton: 'Ambient Light',
    reflectionButton: 'Specular Reflection',
    paletteButton: 'Color Palette',
    paletteVibrant: 'Vibrant Colors',
    palettePastel: 'Pastel Tones',
    paletteMonochrome: 'Monochrome Gray',
    shuffleColors: 'Different Tones',
    shuffleColorsDesc: 'Picks different color shades from the active palette',
    on: 'On',
    off: 'Off',
    view3D: '3D',
    viewTop: 'Top',
    viewFront: 'Front',
    viewReset: 'Reset Camera',

    // Animation Player
    animPlay: 'Play Animation',
    animPause: 'Pause Animation',
    animRewind: 'Rewind',
    animStepBack: 'Step Backward',
    animStepForward: 'Step Forward',
    animFinish: 'Finish All',
    layersLabel: 'Layers:',
    orientationsLabel: 'Orientations:',
    noPlacement: 'No valid placement found',
    orderTip: 'Loading sequence: Starting from base Layer 1 upwards to the top',

    // Notices
    layerCompletedNotice: (layerIdx: number, boxCount: number, nextLayerIdx?: number) =>
      nextLayerIdx
        ? `✓ Layer ${layerIdx} Completed (${boxCount} Boxes) — Moving to Layer ${nextLayerIdx}`
        : `✓ Final Layer (Layer ${layerIdx}) Completed! All boxes positioned.`,
    allCompletedNotice: (total: number) => `🎉 All Packing Completed! (${total} Boxes)`,
    videoRecordingModalTitle: 'Recording Packing Animation',
    videoRecordingModalDesc: 'The 3D WebGL scene is being recorded into a video file as boxes load layer by layer.',
    highCountModalTitle: 'High Box Count Warning',
    highCountModalDesc: (count: number) =>
      `The calculated box count is over 1,000 units (${count.toLocaleString('en-US')} boxes). Rendering more than 1,000 3D objects may cause performance drops or frame stuttering. Are you sure you want to proceed with the calculation?`,
    highCountModalConfirm: 'Yes, Proceed & Render',
    highCountModalCancel: 'Cancel',

    // 3D Orientation Previews Drawer
    orientationsDetailTitle: 'Box Orientation Details & 3D Isometric Previews',
    orientationsDetailDesc: 'Static 3D isometric reference models for each box orientation matching its color, dimensions, and rotation posture in the main render.',
    expandOrientations: 'Show 3D Models',
    collapseOrientations: 'Hide 3D Models',
    orientationItem: (idx: number) => `Orientation ${idx}`,
    dimWidthX: 'Width (X):',
    dimDepthY: 'Depth (Y):',
    dimHeightZ: 'Height (Z):',
    singleBoxVolLabel: 'Unit Volume:',
  },
} as const;

export function useTranslation(lang: Language) {
  return translations[lang];
}
