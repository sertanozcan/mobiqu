import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Topbar } from './components/Topbar';
import { ControlPanel } from './components/ControlPanel';
import { ThreeViewport } from './components/ThreeViewport';
import { TempRange, RotationMode, Product, PackResult, OrientationSummary, Language, PaletteMode } from './types';
import { PRODUCTS_FIXED } from './data/products';
import { computePacking, buildOrientationSummaries } from './solver/packer';
import { generatePackingReportPdf } from './utils/pdfExport';
import { translations } from './i18n/translations';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [language, setLanguage] = useState<Language>('tr');
  const [tempRange, setTempRange] = useState<TempRange | ''>('');
  const [selectedProductKey, setSelectedProductKey] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [boxL, setBoxL] = useState<string>('70');
  const [boxW, setBoxW] = useState<string>('45');
  const [boxH, setBoxH] = useState<string>('110');
  const [rotationMode, setRotationMode] = useState<RotationMode>('z');

  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [summaries, setSummaries] = useState<OrientationSummary[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('vibrant');
  const [variationSeed, setVariationSeed] = useState<number>(0);

  // High box count threshold confirmation state (> 1000 boxes)
  const [pendingCalculation, setPendingCalculation] = useState<{
    result: PackResult;
    orientationSummaries: OrientationSummary[];
  } | null>(null);

  // Video Export & Recording State
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const recordVideoTriggerRef = useRef<(() => void) | null>(null);

  // Sync theme to root class for Tailwind CSS v4 dark variant
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleProductChange = (productKey: string, prod: Product | null) => {
    setSelectedProductKey(productKey);
    setSelectedProduct(prod);
  };

  const calculatePackingWithParams = useCallback(
    (
      prod: Product | null,
      bl: string,
      bw: string,
      bh: string,
      rotMode: RotationMode,
      currentLang: Language,
      palMode: PaletteMode,
      seed: number = 0,
      skipConfirmation: boolean = false
    ) => {
      setWarningMessage(null);
      const curT = translations[currentLang];

      const L = prod ? prod.l : NaN;
      const W = prod ? prod.w : NaN;
      const H = prod ? prod.h : NaN;
      const l = parseFloat(bl);
      const w = parseFloat(bw);
      const h = parseFloat(bh);

      if (![L, W, H, l, w, h].every((v) => Number.isFinite(v) && v > 0)) {
        setWarningMessage(curT.warnInvalid);
        return;
      }

      const result = computePacking(L, W, H, l, w, h, rotMode);
      const orientationSummaries = buildOrientationSummaries(result.placements, palMode, seed);

      if (result.count === 0) {
        setWarningMessage(curT.warnNoFit);
        setPackResult(result);
        setSummaries(orientationSummaries);
        setHasCalculated(true);
        setPendingCalculation(null);
        return;
      }

      // Check upper limit: if > 1000 boxes, prompt for confirmation unless already confirmed
      if (result.count > 1000 && !skipConfirmation) {
        setPendingCalculation({ result, orientationSummaries });
        return;
      }

      setPackResult(result);
      setSummaries(orientationSummaries);
      setHasCalculated(true);
      setPendingCalculation(null);
    },
    []
  );

  const handleConfirmHighCount = () => {
    if (pendingCalculation) {
      setPackResult(pendingCalculation.result);
      setSummaries(pendingCalculation.orientationSummaries);
      setHasCalculated(true);
      setPendingCalculation(null);
    }
  };

  const handleCancelHighCount = () => {
    setPendingCalculation(null);
  };

  const handleCalculate = () => {
    calculatePackingWithParams(selectedProduct, boxL, boxW, boxH, rotationMode, language, paletteMode, variationSeed);
  };

  const handlePaletteModeChange = useCallback(
    (newMode: PaletteMode) => {
      setPaletteMode(newMode);
      setVariationSeed(0);
      if (packResult) {
        setSummaries(buildOrientationSummaries(packResult.placements, newMode, 0));
      }
    },
    [packResult]
  );

  const handleShuffleColors = useCallback(() => {
    setVariationSeed((prev) => {
      const next = prev + 1;
      if (packResult) {
        setSummaries(buildOrientationSummaries(packResult.placements, paletteMode, next));
      }
      return next;
    });
  }, [packResult, paletteMode]);

  // Load a rich ready-to-inspect demo scenario in 1 click
  const handleLoadDemo = () => {
    const defaultProduct = PRODUCTS_FIXED[2]; // Multi-28 (305x305x305)
    setTempRange('+2/+8');
    setSelectedProductKey('fixed:2');
    setSelectedProduct(defaultProduct);
    setBoxL('70');
    setBoxW('45');
    setBoxH('110');
    setRotationMode('z');
    calculatePackingWithParams(defaultProduct, '70', '45', '110', 'z', language, paletteMode);
  };

  // PDF Export
  const handleExportPdf = useCallback(() => {
    if (!selectedProduct || !packResult || packResult.count === 0) return;

    const colorMap: Record<string, string> = {};
    summaries.forEach((s) => {
      colorMap[s.key] = s.color;
    });

    generatePackingReportPdf({
      product: selectedProduct,
      tempRange,
      boxL: parseFloat(boxL),
      boxW: parseFloat(boxW),
      boxH: parseFloat(boxH),
      rotationMode,
      packResult,
      colorMap,
      language,
    });
  }, [selectedProduct, packResult, summaries, tempRange, boxL, boxW, boxH, rotationMode, language]);

  // Video Export trigger
  const handleExportVideo = () => {
    if (recordVideoTriggerRef.current) {
      recordVideoTriggerRef.current();
    }
  };

  const canExport = hasCalculated && packResult !== null && packResult.count > 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-900 dark:text-slate-100">
      <Topbar
        theme={theme}
        onToggleTheme={toggleTheme}
        language={language}
        onLanguageChange={setLanguage}
        onLoadDemo={handleLoadDemo}
        canExport={canExport}
        onExportPdf={handleExportPdf}
        onExportVideo={handleExportVideo}
        isRecordingVideo={isRecordingVideo}
        recordingProgress={recordingProgress}
      />
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <ControlPanel
          language={language}
          tempRange={tempRange}
          onTempChange={setTempRange}
          selectedProductKey={selectedProductKey}
          onProductChange={handleProductChange}
          outerL={selectedProduct ? selectedProduct.l : null}
          outerW={selectedProduct ? selectedProduct.w : null}
          outerH={selectedProduct ? selectedProduct.h : null}
          boxL={boxL}
          boxW={boxW}
          boxH={boxH}
          onBoxLChange={setBoxL}
          onBoxWChange={setBoxW}
          onBoxHChange={setBoxH}
          rotationMode={rotationMode}
          onRotationModeChange={setRotationMode}
          onCalculate={handleCalculate}
          warningMessage={warningMessage}
          canExport={canExport}
          onExportPdf={handleExportPdf}
          onExportVideo={handleExportVideo}
          isRecordingVideo={isRecordingVideo}
        />
        <ThreeViewport
          theme={theme}
          language={language}
          paletteMode={paletteMode}
          onPaletteModeChange={handlePaletteModeChange}
          onShuffleColors={handleShuffleColors}
          packResult={packResult}
          summaries={summaries}
          outerL={selectedProduct ? selectedProduct.l : null}
          outerW={selectedProduct ? selectedProduct.w : null}
          outerH={selectedProduct ? selectedProduct.h : null}
          hasCalculated={hasCalculated}
          onLoadSample={handleLoadDemo}
          onExportPdf={handleExportPdf}
          isRecordingVideo={isRecordingVideo}
          setIsRecordingVideo={setIsRecordingVideo}
          recordingProgress={recordingProgress}
          setRecordingProgress={setRecordingProgress}
          onRegisterRecordTrigger={(fn) => {
            recordVideoTriggerRef.current = fn;
          }}
        />
      </div>

      {/* Confirmation Modal for > 1,000 Boxes */}
      {pendingCalculation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-xl text-left">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {translations[language].highCountModalTitle}
                </h3>
                <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {pendingCalculation.result.count.toLocaleString('tr-TR')} {language === 'tr' ? 'Kutu' : 'Boxes'}
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-6">
              {translations[language].highCountModalDesc(pendingCalculation.result.count)}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelHighCount}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-[0.98]"
              >
                {translations[language].highCountModalCancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmHighCount}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-lg shadow-amber-500/25 transition active:scale-[0.98]"
              >
                {translations[language].highCountModalConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
