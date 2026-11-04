import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Topbar } from './components/Topbar';
import { ControlPanel } from './components/ControlPanel';
import { ThreeViewport } from './components/ThreeViewport';
import { TempRange, RotationMode, Product, PackResult, OrientationSummary } from './types';
import { PRODUCTS_FIXED } from './data/products';
import { computePacking, buildOrientationSummaries } from './solver/packer';
import { generatePackingReportPdf } from './utils/pdfExport';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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
      rotMode: RotationMode
    ) => {
      setWarningMessage(null);

      const L = prod ? prod.l : NaN;
      const W = prod ? prod.w : NaN;
      const H = prod ? prod.h : NaN;
      const l = parseFloat(bl);
      const w = parseFloat(bw);
      const h = parseFloat(bh);

      if (![L, W, H, l, w, h].every((v) => Number.isFinite(v) && v > 0)) {
        setWarningMessage(
          'Lütfen sıcaklık aralığı ve konteyner modeli seçin, ardından kutu ölçülerini pozitif sayılarla girin.'
        );
        return;
      }

      const result = computePacking(L, W, H, l, w, h, rotMode);
      const orientationSummaries = buildOrientationSummaries(result.placements);

      setPackResult(result);
      setSummaries(orientationSummaries);
      setHasCalculated(true);

      if (result.count === 0) {
        setWarningMessage(
          'Bu ölçülerle konteyner içine kutu sığmıyor. Lütfen kutu boyutlarını veya döndürme iznini kontrol edin.'
        );
      }
    },
    []
  );

  const handleCalculate = () => {
    calculatePackingWithParams(selectedProduct, boxL, boxW, boxH, rotationMode);
  };

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
    calculatePackingWithParams(defaultProduct, '70', '45', '110', 'z');
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
    });
  }, [selectedProduct, packResult, summaries, tempRange, boxL, boxW, boxH, rotationMode]);

  // Video Export trigger
  const handleExportVideo = () => {
    if (recordVideoTriggerRef.current) {
      recordVideoTriggerRef.current();
    }
  };

  const canExport = hasCalculated && packResult !== null && packResult.count > 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Topbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLoadDemo={handleLoadDemo}
        canExport={canExport}
        onExportPdf={handleExportPdf}
        onExportVideo={handleExportVideo}
        isRecordingVideo={isRecordingVideo}
        recordingProgress={recordingProgress}
      />
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <ControlPanel
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
    </div>
  );
};

export default App;
