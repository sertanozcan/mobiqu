import React from 'react';
import {
  Thermometer,
  Layers,
  RotateCw,
  Lock,
  ArrowRight,
  AlertCircle,
  Package,
  FileText,
  Video,
} from 'lucide-react';
import { TempRange, RotationMode, Product } from '../types';
import { PRODUCTS_FIXED, PRODUCTS_TEMP } from '../data/products';
import { BOX_PRESETS } from '../data/presets';
import { toLiters } from '../solver/packer';

interface ControlPanelProps {
  tempRange: TempRange | '';
  onTempChange: (temp: TempRange | '') => void;
  selectedProductKey: string;
  onProductChange: (productKey: string, product: Product | null) => void;
  outerL: number | null;
  outerW: number | null;
  outerH: number | null;
  boxL: string;
  boxW: string;
  boxH: string;
  onBoxLChange: (val: string) => void;
  onBoxWChange: (val: string) => void;
  onBoxHChange: (val: string) => void;
  rotationMode: RotationMode;
  onRotationModeChange: (mode: RotationMode) => void;
  onCalculate: () => void;
  warningMessage: string | null;
  canExport?: boolean;
  onExportPdf?: () => void;
  onExportVideo?: () => void;
  isRecordingVideo?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  tempRange,
  onTempChange,
  selectedProductKey,
  onProductChange,
  outerL,
  outerW,
  outerH,
  boxL,
  boxW,
  boxH,
  onBoxLChange,
  onBoxWChange,
  onBoxHChange,
  rotationMode,
  onRotationModeChange,
  onCalculate,
  warningMessage,
  canExport = false,
  onExportPdf,
  onExportVideo,
  isRecordingVideo = false,
}) => {
  const handleTempSelect = (range: TempRange) => {
    onTempChange(range);
    onProductChange('', null);
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || !tempRange) {
      onProductChange('', null);
      return;
    }
    const [kind, idxStr] = val.split(':');
    const idx = parseInt(idxStr, 10);
    const prod =
      kind === 'fixed'
        ? PRODUCTS_FIXED[idx]
        : PRODUCTS_TEMP[tempRange]?.[idx];
    onProductChange(val, prod || null);
  };

  const applyPreset = (presetId: string) => {
    const preset = BOX_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onBoxLChange(preset.l.toString());
      onBoxWChange(preset.w.toString());
      onBoxHChange(preset.h.toString());
    }
  };

  // Calculations for display
  const outerVolumeMm3 =
    outerL && outerW && outerH ? outerL * outerW * outerH : null;
  const singleBoxVolumeMm3 =
    parseFloat(boxL) > 0 && parseFloat(boxW) > 0 && parseFloat(boxH) > 0
      ? parseFloat(boxL) * parseFloat(boxW) * parseFloat(boxH)
      : null;

  return (
    <aside className="w-full md:w-84 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto shrink-0 select-none">
      <div className="p-4 md:p-6 space-y-6">
        {/* Step 1: Container / Outer Box */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              Dış Yük Hacmi (Konteyner)
            </h2>
          </div>

          {/* Temperature Range Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Sıcaklık Aralığı
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { range: '+2/+8', label: '+2 / +8 °C', sub: 'Soğuk Zincir' },
                { range: '-25/-15', label: '-25 / -15 °C', sub: 'Donuk' },
                { range: '+15/+25', label: '+15 / +25 °C', sub: 'Oda Sıcaklığı' },
              ].map((item) => {
                const isSelected = tempRange === item.range;
                return (
                  <button
                    key={item.range}
                    type="button"
                    onClick={() => handleTempSelect(item.range as TempRange)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-500 text-sky-900 dark:text-sky-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Thermometer
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold tracking-tight block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Mobiqu Konteyner Modeli
            </label>
            <div className="relative">
              <select
                id="productSelect"
                disabled={!tempRange}
                value={selectedProductKey}
                onChange={handleProductSelect}
                className="w-full text-xs font-medium bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {!tempRange ? (
                  <option value="">Önce sıcaklık aralığı seçin</option>
                ) : (
                  <>
                    <option value="">Konteyner modeli seçin...</option>
                    <optgroup label="Standart Modeller (Sabit)">
                      {PRODUCTS_FIXED.map((p, idx) => (
                        <option key={`fixed:${idx}`} value={`fixed:${idx}`}>
                          {p.name} ({p.l} × {p.w} × {p.h} mm — {toLiters(p.l * p.w * p.h)})
                        </option>
                      ))}
                    </optgroup>
                    {tempRange && (
                      <optgroup label={`${tempRange} Modelleri`}>
                        {PRODUCTS_TEMP[tempRange]?.map((p, idx) => (
                          <option key={`temp:${idx}`} value={`temp:${idx}`}>
                            {p.name} ({p.l} × {p.w} × {p.h} mm — {toLiters(p.l * p.w * p.h)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Dimension Readout Card */}
          {outerL && outerW && outerH && outerVolumeMm3 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Konteyner İç Hacmi
                </span>
                <span className="font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                  {toLiters(outerVolumeMm3)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Uzunluk (L)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerL} mm</span>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Genişlik (W)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerW} mm</span>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Yükseklik (H)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerH} mm</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* Step 2: Inner Box Dimensions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[11px] font-bold">
                2
              </span>
              Paketlenecek İç Kutu
            </h2>
            {singleBoxVolumeMm3 && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {toLiters(singleBoxVolumeMm3)} / kutu
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">
              Hızlı Örnek Ölçüler:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BOX_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {preset.name} ({preset.l}×{preset.w}×{preset.h})
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Uzunluk (l)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxL}
                  onChange={(e) => onBoxLChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-2 pr-8 text-slate-900 dark:text-white"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Genişlik (w)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxW}
                  onChange={(e) => onBoxWChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-2 pr-8 text-slate-900 dark:text-white"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Yükseklik (h)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxH}
                  onChange={(e) => onBoxHChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-2 pr-8 text-slate-900 dark:text-white"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* Step 3: Rotation Permissions */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            Döndürme İzni
          </h2>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onRotationModeChange('z')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                rotationMode === 'z'
                  ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  rotationMode === 'z'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Sadece Dikey (Z) Ekseni
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  Yükseklik yönü sabit kalır. Sıvı ilaç, flakon ve dik durması gereken yükler için güvenlidir.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onRotationModeChange('free')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                rotationMode === 'free'
                  ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  rotationMode === 'free'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <RotateCw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  3 Eksen Serbest (90°)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  Herhangi bir yüz tabana gelebilir. Maksimum doluluk oranı için tüm 6 yön denenir.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Warning Callout */}
        {warningMessage && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{warningMessage}</div>
          </div>
        )}

        {/* Calculate Action Button */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            id="runBtn"
            onClick={onCalculate}
            className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Yerleşimi Hesapla</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {canExport && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onExportPdf}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Kat Kat Yükleme Talimatı PDF Raporunu İndir"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>PDF Rehber</span>
              </button>

              <button
                type="button"
                disabled={isRecordingVideo}
                onClick={onExportVideo}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isRecordingVideo
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
                title="Yükleme Animasyonunu Video (WebM) Olarak İndir"
              >
                <Video className="w-3.5 h-3.5 text-sky-500" />
                <span>{isRecordingVideo ? 'Kaydediliyor' : 'Video İndir'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
