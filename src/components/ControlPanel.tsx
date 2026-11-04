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
import { TempRange, RotationMode, Product, Language } from '../types';
import { PRODUCTS_FIXED, PRODUCTS_TEMP } from '../data/products';
import { BOX_PRESETS } from '../data/presets';
import { toLiters } from '../solver/packer';
import { useTranslation } from '../i18n/translations';

interface ControlPanelProps {
  language: Language;
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
  language,
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
  const t = useTranslation(language);

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

  const outerVolumeMm3 =
    outerL && outerW && outerH ? outerL * outerW * outerH : null;
  const singleBoxVolumeMm3 =
    parseFloat(boxL) > 0 && parseFloat(boxW) > 0 && parseFloat(boxH) > 0
      ? parseFloat(boxL) * parseFloat(boxW) * parseFloat(boxH)
      : null;

  return (
    <aside className="w-full md:w-88 lg:w-96 apple-glass border-r border-white/60 dark:border-white/10 flex flex-col h-full overflow-y-auto shrink-0 select-none">
      <div className="p-4 md:p-5 space-y-4">
        {/* Step 1: Container Card */}
        <section className="apple-glass-card rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 inline-flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              {t.step1Title}
            </h2>
          </div>

          {/* Temperature Range Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.tempRangeLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { range: '+2/+8', label: '+2 / +8 °C', sub: t.tempCold },
                { range: '-25/-15', label: '-25 / -15 °C', sub: t.tempFrozen },
                { range: '+15/+25', label: '+15 / +25 °C', sub: t.tempRoom },
              ].map((item) => {
                const isSelected = tempRange === item.range;
                return (
                  <button
                    key={item.range}
                    type="button"
                    onClick={() => handleTempSelect(item.range as TempRange)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-sky-500/80 bg-sky-500/15 dark:bg-sky-400/15 text-sky-950 dark:text-sky-100 shadow-sm ring-1 ring-sky-400/40'
                        : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
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
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.modelLabel}
            </label>
            <div className="relative">
              <select
                id="productSelect"
                disabled={!tempRange}
                value={selectedProductKey}
                onChange={handleProductSelect}
                className="w-full text-xs font-medium bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-inner"
              >
                {!tempRange ? (
                  <option value="">{t.modelPlaceholderSelectTemp}</option>
                ) : (
                  <>
                    <option value="">{t.modelPlaceholderSelectModel}</option>
                    <optgroup label={t.groupStandard}>
                      {PRODUCTS_FIXED.map((p, idx) => (
                        <option key={`fixed:${idx}`} value={`fixed:${idx}`}>
                          {p.name} ({p.l} × {p.w} × {p.h} mm — {toLiters(p.l * p.w * p.h)})
                        </option>
                      ))}
                    </optgroup>
                    {tempRange && (
                      <optgroup label={t.groupTempSpecific(tempRange)}>
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
            <div className="p-3 bg-white/50 dark:bg-slate-900/40 rounded-xl border border-white/60 dark:border-white/10 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  {t.containerInnerVolume}
                </span>
                <span className="font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                  {toLiters(outerVolumeMm3)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-white/80 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t.lengthLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerL} mm</span>
                </div>
                <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-white/80 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t.widthLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerW} mm</span>
                </div>
                <div className="p-1.5 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-white/80 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t.heightLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{outerH} mm</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Inner Box Dimensions */}
        <section className="apple-glass-card rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 inline-flex items-center justify-center text-[11px] font-bold">
                2
              </span>
              {t.step2Title}
            </h2>
            {singleBoxVolumeMm3 && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {toLiters(singleBoxVolumeMm3)} / {t.perBoxVolume}
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">
              {t.quickPresets}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BOX_PRESETS.map((preset) => {
                const displayName = language === 'en' ? (preset.nameEn || preset.name) : preset.name;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:bg-white/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all shadow-2xs"
                  >
                    {displayName} ({preset.l}×{preset.w}×{preset.h})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inputs with Apple frosted styling */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.innerLengthLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxL}
                  onChange={(e) => onBoxLChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-white/10 rounded-xl px-2.5 py-2 pr-7 text-slate-900 dark:text-white shadow-inner"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.innerWidthLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxW}
                  onChange={(e) => onBoxWChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-white/10 rounded-xl px-2.5 py-2 pr-7 text-slate-900 dark:text-white shadow-inner"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.innerHeightLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={boxH}
                  onChange={(e) => onBoxHChange(e.target.value)}
                  min="0.1"
                  step="any"
                  className="w-full text-xs font-semibold tabular-nums bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-white/10 rounded-xl px-2.5 py-2 pr-7 text-slate-900 dark:text-white shadow-inner"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Rotation Permissions */}
        <section className="apple-glass-card rounded-2xl p-4 space-y-2.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 inline-flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            {t.step3Title}
          </h2>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onRotationModeChange('z')}
              className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                rotationMode === 'z'
                  ? 'border-sky-500/80 bg-sky-500/15 dark:bg-sky-400/15 shadow-sm ring-1 ring-sky-400/40'
                  : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  rotationMode === 'z'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {t.rotZTitle}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  {t.rotZDesc}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onRotationModeChange('free')}
              className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                rotationMode === 'free'
                  ? 'border-sky-500/80 bg-sky-500/15 dark:bg-sky-400/15 shadow-sm ring-1 ring-sky-400/40'
                  : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  rotationMode === 'free'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                }`}
              >
                <RotateCw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {t.rotFreeTitle}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  {t.rotFreeDesc}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Warning Callout */}
        {warningMessage && (
          <div className="p-3 bg-amber-500/15 border border-amber-400/40 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{warningMessage}</div>
          </div>
        )}

        {/* Calculate Action Button */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            id="runBtn"
            onClick={onCalculate}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Layers className="w-4 h-4" />
            <span>{t.calculateBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {canExport && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onExportPdf}
                className="py-2.5 px-3 rounded-2xl apple-glass-card hover:bg-white/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                title={t.pdfExport}
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>{t.pdfExport}</span>
              </button>

              <button
                type="button"
                disabled={isRecordingVideo}
                onClick={onExportVideo}
                className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                  isRecordingVideo
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-900 dark:text-amber-200'
                    : 'apple-glass-card hover:bg-white/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
                title={t.videoExport}
              >
                <Video className="w-3.5 h-3.5 text-sky-500" />
                <span>{isRecordingVideo ? t.videoRecording : t.videoExport}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
