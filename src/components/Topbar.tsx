import React from 'react';
import { Sun, Moon, Box, Sparkles, FileText, Video, Loader2 } from 'lucide-react';

interface TopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLoadDemo: () => void;
  canExport: boolean;
  onExportPdf: () => void;
  onExportVideo: () => void;
  isRecordingVideo: boolean;
  recordingProgress: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  theme,
  onToggleTheme,
  onLoadDemo,
  canExport,
  onExportPdf,
  onExportVideo,
  isRecordingVideo,
  recordingProgress,
}) => {
  const isLight = theme === 'light';

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 backdrop-blur-md z-20 shrink-0">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shadow-sm shadow-sky-500/20">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              MOBIQU
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded">
              3D Yükleme & Kat Planı
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Sıcaklık Kontrollü Hacim & Kat Kat Paketleme Simülatörü
          </p>
        </div>
      </div>

      {/* Zone 2: Navigation Steps */}
      <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="text-slate-800 dark:text-slate-200">1. Konteyner</span>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-slate-800 dark:text-slate-200">2. Kutu Boyutu</span>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sky-600 dark:text-sky-400 font-semibold">3. Yükleme Animasyonu</span>
      </div>

      {/* Zone 3: Actions (Exports, Demo & Theme) */}
      <div className="flex items-center gap-2">
        {canExport && (
          <>
            {/* PDF Export Button */}
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
              title="Kat kat yüklemeyi anlatan detaylı PDF raporunu indir"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Kat Planı PDF</span>
            </button>

            {/* Video Export Button */}
            <button
              type="button"
              disabled={isRecordingVideo}
              onClick={onExportVideo}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                isRecordingVideo
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
              }`}
              title="3D Yükleme animasyonunu video (WebM) olarak kaydet"
            >
              {isRecordingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Video Kaydediliyor (%{recordingProgress})</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-sky-500" />
                  <span>Video İndir</span>
                </>
              )}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Standart bir örnek konfigürasyon yükler"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Hızlı Örnek</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isLight ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
          aria-label="Tema Değiştir"
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};
