import jsPDF from 'jspdf';
import { PackResult, Product, RotationMode, TempRange } from '../types';
import { formatNumber, toLiters } from '../solver/packer';

interface ExportPdfOptions {
  product: Product;
  tempRange: TempRange | '';
  boxL: number;
  boxW: number;
  boxH: number;
  rotationMode: RotationMode;
  packResult: PackResult;
  colorMap: Record<string, string>;
}

// Generate a crisp top-down 2D canvas schematic for a specific layer
function renderLayerSchematic(
  layerIndex: number,
  placements: PackResult['placements'],
  containerL: number,
  containerW: number,
  colorMap: Record<string, string>
): string {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 550;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Margins for labels & legends
  const marginLeft = 60;
  const marginTop = 45;
  const areaWidth = width - 120;
  const areaHeight = height - 90;

  // Scale container to fit area while keeping aspect ratio
  const scale = Math.min(areaWidth / containerL, areaHeight / containerW);
  const contDrawW = containerL * scale;
  const contDrawH = containerW * scale;

  const startX = marginLeft + (areaWidth - contDrawW) / 2;
  const startY = marginTop + (areaHeight - contDrawH) / 2;

  // Title / Direction labels
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KAT ${layerIndex} KUŞBAKIŞI DİZİLİM PLANI`, startX, startY - 26);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ ARKA (BACK)', startX + contDrawW / 2, startY - 10);
  ctx.fillText('▼ ÖN (FRONT / KAPAK)', startX + contDrawW / 2, startY + contDrawH + 20);

  ctx.textAlign = 'right';
  ctx.fillText('◄ SOL', startX - 10, startY + contDrawH / 2);
  ctx.textAlign = 'left';
  ctx.fillText('SAĞ ►', startX + contDrawW + 10, startY + contDrawH / 2);

  // Container floor boundary
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(startX, startY, contDrawW, contDrawH);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(startX, startY, contDrawW, contDrawH);

  // Light grid lines inside container
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  const step = 50 * scale;
  for (let x = startX + step; x < startX + contDrawW; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + contDrawH);
    ctx.stroke();
  }
  for (let y = startY + step; y < startY + contDrawH; y += step) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contDrawW, y);
    ctx.stroke();
  }

  // Draw boxes
  placements.forEach((p, idx) => {
    const boxX = startX + p.x * scale;
    // Map Y: coordinate from front to back
    const boxY = startY + p.y * scale;
    const boxW = p.dx * scale;
    const boxH = p.dy * scale;

    const key = `${p.dx.toFixed(3)}_${p.dy.toFixed(3)}_${p.dz.toFixed(3)}`;
    const color = colorMap[key] || '#0284c7';

    // Box body
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);
    ctx.globalAlpha = 1.0;

    // Box border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

    // Box label (index & dimensions if space permits)
    const boxIndex = p.index || idx + 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (boxW > 28 && boxH > 22) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`#${boxIndex}`, boxX + boxW / 2, boxY + boxH / 2 - (boxH > 35 ? 6 : 0));
      if (boxH > 35) {
        ctx.font = '9px sans-serif';
        ctx.fillText(`${Math.round(p.dx)}×${Math.round(p.dy)}`, boxX + boxW / 2, boxY + boxH / 2 + 8);
      }
    } else {
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${boxIndex}`, boxX + boxW / 2, boxY + boxH / 2);
    }
  });

  // Footer label inside image
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Konteyner Boyutları: ${containerL} mm (L) × ${containerW} mm (W) · Toplam ${placements.length} Adet Kutu`,
    startX,
    height - 10
  );

  return canvas.toDataURL('image/png');
}

export function generatePackingReportPdf(options: ExportPdfOptions): void {
  const {
    product,
    tempRange,
    boxL,
    boxW,
    boxH,
    rotationMode,
    packResult,
    colorMap,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- PAGE 1: GENEL YERLEŞİM PLANI & KPI ÖZETİ ---
  // Header Band
  doc.setFillColor(2, 132, 199); // Sky-600
  doc.rect(margin, margin, pageWidth - margin * 2, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MOBIQU', margin + 6, margin + 9);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('3D YÜKLEME VE KAT PLANI TALİMATNAMESİ', margin + 6, margin + 16);

  doc.setFontSize(8);
  doc.text(`Rapor Tarihi: ${dateStr} - ${timeStr}`, pageWidth - margin - 6, margin + 11, { align: 'right' });
  doc.text('Sertifikalı Soğuk Zincir Ambalaj Standardı', pageWidth - margin - 6, margin + 17, { align: 'right' });

  // Section 1: Konteyner & Kutu Özellikleri
  let curY = margin + 28;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. SİSTEM & YÜK PARAMETRELERİ', margin, curY);

  curY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 28, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const col1X = margin + 5;
  const col2X = margin + 65;
  const col3X = margin + 125;

  doc.setFont('helvetica', 'bold');
  doc.text('Konteyner Modeli:', col1X, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${product.name} (${tempRange || 'Standart'})`, col1X, curY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Konteyner İç Ölçüleri:', col1X, curY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${product.l} × ${product.w} × ${product.h} mm (${toLiters(product.l * product.w * product.h)})`, col1X, curY + 23);

  doc.setFont('helvetica', 'bold');
  doc.text('İç Kutu Ölçüleri:', col2X, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${boxL} × ${boxW} × ${boxH} mm`, col2X, curY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Birim Kutu Hacmi:', col2X, curY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(toLiters(boxL * boxW * boxH), col2X, curY + 23);

  doc.setFont('helvetica', 'bold');
  doc.text('Döndürme Kısıtı:', col3X, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    rotationMode === 'z' ? 'Sadece Dikey (Z) Eksen' : '3 Eksen Serbest (90°)',
    col3X,
    curY + 11
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Toplam Kat Sayısı:', col3X, curY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${packResult.layers.length} Kat`, col3X, curY + 23);

  // Section 2: Yerleşim KPI Kartları
  curY += 34;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. YERLEŞİM VE HACİM PERFORMANSI', margin, curY);

  curY += 4;
  const kpiW = (pageWidth - margin * 2 - 9) / 4;
  const kpis = [
    { label: 'TOPLAM ADET', val: `${packResult.count} Kutu`, color: [2, 132, 199] },
    { label: 'DOLULUK ORANI', val: `%${formatNumber(packResult.efficiency)}`, color: [13, 148, 136] },
    { label: 'DOLU HACİM', val: toLiters(packResult.usedVolume), color: [15, 23, 42] },
    { label: 'KALAN BOŞLUK', val: toLiters(packResult.leftoverVolume), color: [217, 119, 6] },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kX, curY, kpiW, 18, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label, kX + kpiW / 2, curY + 6, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kX + kpiW / 2, curY + 13, { align: 'center' });
  });

  // Section 3: Kat Kat Yükleme Özet Tablosu
  curY += 25;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. KAT KAT DİZİLİM ÖZETİ', margin, curY);

  curY += 4;
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  doc.text('Kat No', margin + 4, curY + 4.5);
  doc.text('Yükseklik Aralığı (Z)', margin + 28, curY + 4.5);
  doc.text('Kat Kalınlığı', margin + 85, curY + 4.5);
  doc.text('Kutu Adedi', margin + 125, curY + 4.5);
  doc.text('Kümülatif Toplam', margin + 155, curY + 4.5);

  curY += 7;
  let runningTotal = 0;
  packResult.layers.forEach((layer, idx) => {
    runningTotal += layer.boxCount;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, curY, pageWidth - margin * 2, 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, curY + 6.5, pageWidth - margin, curY + 6.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(`Kat ${layer.layerIndex}`, margin + 4, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${Math.round(layer.minZ)} mm — ${Math.round(layer.maxZ)} mm`, margin + 28, curY + 4.5);
    doc.text(`${Math.round(layer.height)} mm`, margin + 85, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`${layer.boxCount} adet`, margin + 125, curY + 4.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${runningTotal} / ${packResult.count}`, margin + 155, curY + 4.5);

    curY += 6.5;
  });

  // Operator Guidelines Box
  curY += 8;
  doc.setFillColor(254, 243, 199); // amber-50
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Depo ve Sevkiyat Operatörü İçin Önemli Notlar:', margin + 4, curY + 5.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('• Yükleme mutlaka Kat 1 tabanından başlayarak yukarı doğru sıralı olarak yapılmalıdır.', margin + 4, curY + 10);
  doc.text('• Her katmanın kuşbakışı yerleşim şeması sonraki sayfalarda kutu numaraları (#) ile detaylandırılmıştır.', margin + 4, curY + 14);
  doc.text('• İlaç ve aşı gibi dik durması gereken ürünlerde kutu yöneliminin bozulmadığını kontrol edin.', margin + 4, curY + 18);

  // Footer for Page 1
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `MOBIQU Akıllı Yükleme Çözümleri · Sayfa 1 / ${packResult.layers.length + 1}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // --- SUBSEQUENT PAGES: KAT KAT DETAYLI ŞEMALAR ---
  packResult.layers.forEach((layer, lIdx) => {
    doc.addPage();
    const pageNum = lIdx + 2;
    const totalPages = packResult.layers.length + 1;

    // Layer Page Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, margin, pageWidth - margin * 2, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`ADIM ${layer.layerIndex}: KAT ${layer.layerIndex} YERLEŞİM ŞEMASI`, margin + 6, margin + 7.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Yükseklik: Z = ${Math.round(layer.minZ)} mm ile ${Math.round(layer.maxZ)} mm arası (Kat Kalınlığı: ${Math.round(layer.height)} mm)`,
      margin + 6,
      margin + 12.5
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`${layer.boxCount} Kutu`, pageWidth - margin - 6, margin + 10, { align: 'right' });

    // Generate Top-Down 2D Schematic image
    const schematicDataUrl = renderLayerSchematic(
      layer.layerIndex,
      layer.placements,
      product.l,
      product.w,
      colorMap
    );

    let nextY = margin + 20;

    if (schematicDataUrl) {
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = 120;
      doc.addImage(schematicDataUrl, 'PNG', margin, nextY, imgWidth, imgHeight);
      nextY += imgHeight + 4;
    }

    // Step instructions for this layer
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, nextY, pageWidth - margin * 2, 42, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Kat ${layer.layerIndex} Yükleme Adımları:`, margin + 5, nextY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const stepTexts = [
      `1. Şemadaki numaralandırmaya göre (#${layer.startIndex + 1} - #${layer.endIndex + 1}) kutuları konteyner içine sırayla dizin.`,
      `2. Kutuları şemadaki renk kodlarına uygun yönelimde yerleştirin. Arka duvardan ön kapağa doğru ilerleyin.`,
      `3. Kutuların birbirine tam yaslandığından ve yan boşluk kalmadığından emin olun.`,
      `4. Bu katmanın tamamlanmasıyla konteyner iç yük yüksekliği ${Math.round(layer.maxZ)} mm seviyesine ulaşacaktır.`,
      lIdx < packResult.layers.length - 1
        ? `5. Kat ${layer.layerIndex} tamamlandıktan sonra Kat ${layer.layerIndex + 1} kurulumuna geçiniz.`
        : `5. Bu son katmandır. Konteyner yükleme işlemi başarıyla tamamlanmıştır. Kapağı kapatınız.`,
    ];

    stepTexts.forEach((st, sIdx) => {
      doc.text(st, margin + 5, nextY + 12 + sIdx * 5.8);
    });

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MOBIQU Akıllı Yükleme Çözümleri · Sayfa ${pageNum} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  });

  // Download PDF
  const filename = `mobiqu-yukleme-kat-plani-${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
  doc.save(filename);
}
