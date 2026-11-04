import React, { useMemo } from 'react';
import { Box, Layers } from 'lucide-react';
import { OrientationSummary, Language } from '../types';
import { formatNumber, toLiters } from '../solver/packer';
import { getOrientationIsometricImage } from '../utils/orientationPreview';
import { useTranslation } from '../i18n/translations';

interface Orientation3DCardProps {
  summary: OrientationSummary;
  index: number;
  language: Language;
  isDark: boolean;
  specular: boolean;
}

export const Orientation3DCard: React.FC<Orientation3DCardProps> = ({
  summary,
  index,
  language,
  isDark,
  specular,
}) => {
  const t = useTranslation(language);

  // Generate or retrieve cached 3D isometric snapshot
  const snapshotDataUrl = useMemo(() => {
    return getOrientationIsometricImage(
      summary.dx,
      summary.dy,
      summary.dz,
      summary.color,
      isDark,
      specular
    );
  }, [summary.dx, summary.dy, summary.dz, summary.color, isDark, specular]);

  const singleVolLiters = toLiters(summary.dx * summary.dy * summary.dz);

  return (
    <div className="apple-glass-card rounded-2xl p-2.5 flex flex-col items-center justify-between min-w-[170px] sm:min-w-[190px] max-w-[220px] flex-1 border border-white/70 dark:border-white/10 shadow-sm hover:shadow-md transition-all group shrink-0">
      {/* Top Header: Badge, Dot, Share % */}
      <div className="w-full flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200/50 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px]">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-black/10 dark:border-white/20"
            style={{ backgroundColor: summary.color }}
          />
          <span>{t.orientationItem(index + 1)}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 tabular-nums">
          %{formatNumber(summary.percentage, 0)}
        </span>
      </div>

      {/* 3D Isometric Snapshot (Non-rotatable static render) */}
      <div className="my-1.5 w-full flex flex-col items-center justify-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-b from-white/70 to-white/30 dark:from-slate-800/60 dark:to-slate-900/40 border border-white/80 dark:border-white/5 shadow-inner">
          {snapshotDataUrl ? (
            <img
              src={snapshotDataUrl}
              alt={`3D Model ${summary.dx}x${summary.dy}x${summary.dz}mm`}
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md group-hover:scale-105 transition-transform duration-300"
              draggable={false}
            />
          ) : (
            <Box className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          )}
        </div>
      </div>

      {/* Dimensions Breakdown */}
      <div className="w-full space-y-1 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60 text-[11px]">
        <div className="text-center font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
          {formatNumber(summary.dx, 0)} × {formatNumber(summary.dy, 0)} × {formatNumber(summary.dz, 0)} mm
        </div>

        <div className="grid grid-cols-3 gap-1 text-[9px] text-center">
          <div className="p-0.5 rounded-md bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/5">
            <span className="text-slate-400 block">{t.dimWidthX}</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatNumber(summary.dx, 0)}</span>
          </div>
          <div className="p-0.5 rounded-md bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/5">
            <span className="text-slate-400 block">{t.dimDepthY}</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatNumber(summary.dy, 0)}</span>
          </div>
          <div className="p-0.5 rounded-md bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/5">
            <span className="text-slate-400 block">{t.dimHeightZ}</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatNumber(summary.dz, 0)}</span>
          </div>
        </div>

        {/* Count and volume */}
        <div className="flex items-center justify-between text-[10px] pt-0.5 text-slate-600 dark:text-slate-300">
          <span className="font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <strong className="text-slate-900 dark:text-white font-extrabold">{summary.count}</strong> {t.hudTotalBoxes}
          </span>
          <span className="text-[9px] text-slate-400 tabular-nums">
            {singleVolLiters}
          </span>
        </div>
      </div>
    </div>
  );
};
