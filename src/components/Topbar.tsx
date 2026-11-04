import React from 'react';
import { Sun, Moon, Box, Sparkles, FileText, Video, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface TopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
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
  language,
  onLanguageChange,
  onLoadDemo,
  canExport,
  onExportPdf,
  onExportVideo,
  isRecordingVideo,
  recordingProgress,
}) => {
  const isLight = theme === 'light';
  const t = useTranslation(language);

  return (
    <header className="relative h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/60 dark:border-white/10 apple-glass z-20 shrink-0">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center shadow-md shadow-sky-500/25">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              {t.appTitle}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
              {t.appBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Zone 2: Official Mobiqu Center Logo (Mathematically Centered at 50% Screen Width) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
        <a
          href="https://mobiqu.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center transition-all hover:opacity-85 active:scale-[0.98]"
          title="Mobiqu - www.mobiqu.com"
        >
          <img
            src={isLight ? '/assets/mobiqu-logo-black.svg' : '/assets/mobiqu-logo-white.svg'}
            alt="Mobiqu"
            className="h-6 sm:h-7 md:h-8 w-auto object-contain"
          />
        </a>
      </div>

      {/* Zone 3: Actions (Language Switcher, Exports, Demo & Theme) */}
      <div className="flex items-center gap-2">
        {/* Language Switcher Segmented Control (TR | EN) */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-slate-700/50 shadow-inner">
          <button
            type="button"
            onClick={() => onLanguageChange('tr')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'tr'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Türkçe"
          >
            TR
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="English"
          >
            EN
          </button>
        </div>

        {canExport && (
          <>
            {/* PDF Export Button */}
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all border border-slate-200/60 dark:border-slate-700/50 shadow-xs"
              title={t.pdfExport}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{t.pdfExport}</span>
            </button>

            {/* Video Export Button */}
            <button
              type="button"
              disabled={isRecordingVideo}
              onClick={onExportVideo}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs ${
                isRecordingVideo
                  ? 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/50'
              }`}
              title={t.videoExport}
            >
              {isRecordingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>%{recordingProgress}</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-sky-500" />
                  <span className="hidden sm:inline">{t.videoExport}</span>
                </>
              )}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
          title={t.quickDemoTitle}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">{t.quickDemo}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          title={isLight ? t.themeDark : t.themeLight}
          aria-label="Theme Toggle"
        >
          {isLight ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold">{t.themeLightText}</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-semibold">{t.themeDarkText}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
