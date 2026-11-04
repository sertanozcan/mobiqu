import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Eye,
  Box,
  Compass,
  CheckCircle2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Video,
  FileText,
  Loader2,
  Check,
  Zap,
} from 'lucide-react';
import { PackResult, OrientationSummary, LayerInfo } from '../types';
import { formatNumber, toLiters } from '../solver/packer';
import { startCanvasRecording, downloadBlob } from '../utils/videoRecorder';

interface ThreeViewportProps {
  packResult: PackResult | null;
  summaries: OrientationSummary[];
  outerL: number | null;
  outerW: number | null;
  outerH: number | null;
  hasCalculated: boolean;
  onLoadSample: () => void;
  onExportPdf: () => void;
  isRecordingVideo: boolean;
  setIsRecordingVideo: (val: boolean) => void;
  recordingProgress: number;
  setRecordingProgress: (val: number) => void;
  onRegisterRecordTrigger?: (fn: () => void) => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  packResult,
  summaries,
  outerL,
  outerW,
  outerH,
  hasCalculated,
  onLoadSample,
  onExportPdf,
  isRecordingVideo,
  setIsRecordingVideo,
  recordingProgress,
  setRecordingProgress,
  onRegisterRecordTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  // Camera orbit state
  const azimuthRef = useRef<number>(0.75);
  const polarRef = useRef<number>(1.1);
  const radiusRef = useRef<number>(12);
  const camTargetYRef = useRef<number>(2);
  const draggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);

  // Viewport display controls
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);

  // Animation Playback State
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1); // 0.5, 1, 2, 4
  const [layerNotice, setLayerNotice] = useState<string | null>(null);
  const [isLayerTransitioning, setIsLayerTransitioning] = useState<boolean>(false);

  const totalBoxes = packResult ? packResult.sortedPlacements.length : 0;
  const layers = packResult ? packResult.layers : [];

  // Determine which layer is currently active based on visibleCount
  const currentActiveLayer: LayerInfo | undefined = layers.find(
    (l) => visibleCount > l.startIndex && visibleCount <= l.endIndex + 1
  ) || layers[layers.length - 1];

  const updateCamera = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const azimuth = azimuthRef.current;
    const polar = polarRef.current;
    const radius = radiusRef.current;
    const camTargetY = camTargetYRef.current;

    camera.position.set(
      radius * Math.sin(polar) * Math.sin(azimuth),
      radius * Math.cos(polar) + camTargetY,
      radius * Math.sin(polar) * Math.cos(azimuth)
    );
    camera.lookAt(0, camTargetY, 0);
  };

  const fitCameraToContainer = (halfX: number, halfY: number, halfZ: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const boundingRadius = Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ);
    const vFOVrad = (camera.fov * Math.PI) / 180;
    const hFOVrad = 2 * Math.atan(Math.tan(vFOVrad / 2) * camera.aspect);
    const limitingFOVrad = Math.min(vFOVrad, hFOVrad);
    radiusRef.current = (boundingRadius / Math.sin(limitingFOVrad / 2)) * 1.35;
    updateCamera();
  };

  const setViewAngle = (type: 'iso' | 'top' | 'front') => {
    if (type === 'iso') {
      azimuthRef.current = 0.75;
      polarRef.current = 1.1;
    } else if (type === 'top') {
      azimuthRef.current = 0.001;
      polarRef.current = 0.05;
    } else if (type === 'front') {
      azimuthRef.current = 0;
      polarRef.current = Math.PI / 2;
    }
    updateCamera();
  };

  const resetCamera = () => {
    if (outerL && outerW && outerH) {
      const maxDim = Math.max(outerL, outerW, outerH);
      const scale = 8 / maxDim;
      azimuthRef.current = 0.75;
      polarRef.current = 1.1;
      fitCameraToContainer((outerL * scale) / 2, (outerH * scale) / 2, (outerW * scale) / 2);
    } else {
      azimuthRef.current = 0.75;
      polarRef.current = 1.1;
      radiusRef.current = 12;
      updateCamera();
    }
  };

  // Reset or start animation when new packResult arrives
  useEffect(() => {
    if (packResult && packResult.sortedPlacements.length > 0) {
      setVisibleCount(packResult.sortedPlacements.length);
      setIsPlaying(false);
      setLayerNotice(null);
    }
  }, [packResult]);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Necessary for canvas.captureStream and video export
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;

    container.appendChild(renderer.domElement);

    // Modern studio lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(8, 14, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    fillLight.position.set(-10, 6, -8);
    scene.add(fillLight);

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    updateCamera();

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Mouse and Touch Listeners
    const handleMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      azimuthRef.current -= dx * 0.006;
      polarRef.current = Math.min(Math.PI - 0.05, Math.max(0.05, polarRef.current - dy * 0.006));
      updateCamera();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      radiusRef.current = Math.min(70, Math.max(2, radiusRef.current * (1 + e.deltaY * 0.0012)));
      updateCamera();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchLastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchLastRef.current) {
        const dx = e.touches[0].clientX - touchLastRef.current.x;
        const dy = e.touches[0].clientY - touchLastRef.current.y;
        touchLastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        azimuthRef.current -= dx * 0.006;
        polarRef.current = Math.min(Math.PI - 0.05, Math.max(0.05, polarRef.current - dy * 0.006));
        updateCamera();
        e.preventDefault();
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    domEl.addEventListener('wheel', handleWheel, { passive: false });
    domEl.addEventListener('touchstart', handleTouchStart);
    domEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
          updateCamera();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      domEl.removeEventListener('wheel', handleWheel);
      domEl.removeEventListener('touchstart', handleTouchStart);
      domEl.removeEventListener('touchmove', handleTouchMove);
      resizeObserver.disconnect();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, []);

  // Animation Step Interval Loop
  useEffect(() => {
    if (!isPlaying || !packResult || totalBoxes === 0 || isRecordingVideo) {
      return;
    }

    if (visibleCount >= totalBoxes) {
      setIsPlaying(false);
      setLayerNotice(`🎉 Tüm Yükleme Tamamlandı! (${totalBoxes} Kutu)`);
      return;
    }

    // Base interval adjusted by speed: e.g. 140ms / playSpeed
    const baseInterval = 140 / playSpeed;

    const timer = setTimeout(() => {
      const nextCount = visibleCount + 1;

      // Check if nextCount completes a layer
      const completedLayer = layers.find((l) => l.endIndex + 1 === nextCount);

      if (completedLayer) {
        const isLastLayer = completedLayer.layerIndex === layers.length;
        if (isLastLayer) {
          setLayerNotice(`✓ Son Kat (Kat ${completedLayer.layerIndex}) Tamamlandı! Toplam ${totalBoxes} kutu.`);
        } else {
          setLayerNotice(`✓ Kat ${completedLayer.layerIndex} Tamamlandı (${completedLayer.boxCount} Kutu) — Kat ${completedLayer.layerIndex + 1}'e Geçiliyor`);
        }

        setIsLayerTransitioning(true);
        setVisibleCount(nextCount);

        // Pause slightly longer at layer milestone so the user clearly sees it
        setTimeout(() => {
          setIsLayerTransitioning(false);
        }, 650 / playSpeed);
      } else {
        setVisibleCount(nextCount);
      }
    }, isLayerTransitioning ? (700 / playSpeed) : baseInterval);

    return () => clearTimeout(timer);
  }, [isPlaying, visibleCount, totalBoxes, playSpeed, packResult, layers, isLayerTransitioning, isRecordingVideo]);

  // Video Recording Process
  const handleRecordVideo = useCallback(async () => {
    if (!canvasRef.current || !packResult || totalBoxes === 0) return;

    setIsPlaying(false);
    setIsRecordingVideo(true);
    setRecordingProgress(0);

    const canvas = canvasRef.current;
    const recorder = startCanvasRecording(canvas, 30);
    if (!recorder) {
      setIsRecordingVideo(false);
      alert('Tarayıcınız WebM video kaydını desteklemiyor.');
      return;
    }

    try {
      // 1. Reset to start
      setVisibleCount(0);
      setLayerNotice(null);
      await new Promise((r) => setTimeout(r, 400));

      const stepDelay = Math.max(40, Math.min(100, Math.round(2500 / totalBoxes)));

      // 2. Play animation step by step
      for (let i = 1; i <= totalBoxes; i++) {
        setVisibleCount(i);
        const progress = Math.round((i / totalBoxes) * 100);
        setRecordingProgress(progress);

        // Check layer milestone
        const completedLayer = layers.find((l) => l.endIndex + 1 === i);
        if (completedLayer) {
          const isLast = completedLayer.layerIndex === layers.length;
          setLayerNotice(
            isLast
              ? `✓ Kat ${completedLayer.layerIndex} Tamamlandı! Toplam ${totalBoxes} Kutu.`
              : `✓ Kat ${completedLayer.layerIndex} Tamamlandı (${completedLayer.boxCount} Kutu) — Kat ${completedLayer.layerIndex + 1}'e Geçiliyor`
          );
          // Pause to emphasize completed layer in video
          await new Promise((r) => setTimeout(r, 450));
        } else {
          await new Promise((r) => setTimeout(r, stepDelay));
        }
      }

      // Hold completed frame for 1 second in video
      await new Promise((r) => setTimeout(r, 900));

      // 3. Stop recorder & download
      const videoBlob = await recorder.stop();
      const filename = `mobiqu-yukleme-animasyonu-${outerL}x${outerW}x${outerH}.webm`;
      downloadBlob(videoBlob, filename);
    } catch (err) {
      console.error('Error during video recording:', err);
      recorder.cancel();
      alert('Video kaydedilirken bir hata oluştu.');
    } finally {
      setIsRecordingVideo(false);
      setRecordingProgress(100);
    }
  }, [packResult, totalBoxes, layers, outerL, outerW, outerH, setIsRecordingVideo, setRecordingProgress]);

  // Register record trigger for Topbar & ControlPanel
  useEffect(() => {
    if (onRegisterRecordTrigger) {
      onRegisterRecordTrigger(handleRecordVideo);
    }
  }, [onRegisterRecordTrigger, handleRecordVideo]);

  // Jump to specific layer
  const jumpToLayer = (layer: LayerInfo) => {
    setIsPlaying(false);
    setVisibleCount(layer.endIndex + 1);
    setLayerNotice(`Kat ${layer.layerIndex} (${layer.boxCount} Kutu, Z: ${Math.round(layer.minZ)} - ${Math.round(layer.maxZ)} mm)`);
  };

  // Build Scene whenever inputs, results, or visibleCount changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ('geometry' in child && (child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    if (!packResult || outerL === null || outerW === null || outerH === null) {
      return;
    }

    const { sortedPlacements } = packResult;
    const L = outerL;
    const W = outerW;
    const H = outerH;

    const maxDim = Math.max(L, W, H);
    const scale = 8 / maxDim;
    camTargetYRef.current = (H * scale) / 2;

    // Outer Container Wireframe
    const contGeo = new THREE.BoxGeometry(L * scale, H * scale, W * scale);
    const contEdges = new THREE.EdgesGeometry(contGeo);
    const contLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const contLine = new THREE.LineSegments(contEdges, contLineMat);
    contLine.position.set(0, (H * scale) / 2, 0);
    contLine.renderOrder = 999;
    group.add(contLine);

    // Frosted Translucent Container Wall Shell
    const contFaceMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const contFace = new THREE.Mesh(contGeo, contFaceMat);
    contFace.position.set(0, (H * scale) / 2, 0);
    contFace.renderOrder = -1;
    group.add(contFace);

    // Floor grid
    const gridDim = Math.max(L, W) * scale * 1.5;
    const gridHelper = new THREE.GridHelper(gridDim, 16, 0x94a3b8, 0x64748b);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).depthWrite = false;
    gridHelper.renderOrder = -2;
    group.add(gridHelper);

    // Color map
    const colorMap: Record<string, string> = {};
    for (const item of summaries) {
      colorMap[item.key] = item.color;
    }

    // Filter by animation visibleCount
    const animatedPlacements = sortedPlacements.slice(0, visibleCount);

    const isDense = animatedPlacements.length <= 1500;

    if (isDense) {
      animatedPlacements.forEach((p, idx) => {
        const isLatestBox = idx === animatedPlacements.length - 1 && isPlaying;
        const key = `${p.dx.toFixed(3)}_${p.dy.toFixed(3)}_${p.dz.toFixed(3)}`;
        const color = isLatestBox ? '#f59e0b' : (colorMap[key] || '#0284c7');

        const geo = new THREE.BoxGeometry(
          p.dx * scale * 0.985,
          p.dz * scale * 0.985,
          p.dy * scale * 0.985
        );
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.05,
          wireframe: wireframeMode,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 1;
        mesh.position.set(
          (p.x + p.dx / 2 - L / 2) * scale,
          (p.z + p.dz / 2) * scale,
          (p.y + p.dy / 2 - W / 2) * scale
        );
        group.add(mesh);

        if (!wireframeMode) {
          const edges = new THREE.EdgesGeometry(geo);
          const edgeLine = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
              color: 0x0f172a,
              transparent: true,
              opacity: 0.35,
              depthWrite: false,
            })
          );
          edgeLine.position.copy(mesh.position);
          edgeLine.renderOrder = 2;
          group.add(edgeLine);
        }
      });
    } else {
      // Instanced Rendering for massive counts
      const byOrientation: Record<
        string,
        { dx: number; dy: number; dz: number; items: typeof animatedPlacements }
      > = {};
      for (const p of animatedPlacements) {
        const key = `${p.dx.toFixed(3)}_${p.dy.toFixed(3)}_${p.dz.toFixed(3)}`;
        if (!byOrientation[key]) {
          byOrientation[key] = { dx: p.dx, dy: p.dy, dz: p.dz, items: [] };
        }
        byOrientation[key].items.push(p);
      }

      for (const key in byOrientation) {
        const o = byOrientation[key];
        const color = colorMap[key] || '#0284c7';
        const geo = new THREE.BoxGeometry(
          o.dx * scale * 0.98,
          o.dz * scale * 0.98,
          o.dy * scale * 0.98
        );
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.05,
          wireframe: wireframeMode,
        });
        const inst = new THREE.InstancedMesh(geo, mat, o.items.length);
        inst.frustumCulled = false;
        inst.renderOrder = 1;
        const dummy = new THREE.Object3D();
        o.items.forEach((p, idx) => {
          dummy.position.set(
            (p.x + p.dx / 2 - L / 2) * scale,
            (p.z + p.dz / 2) * scale,
            (p.y + p.dy / 2 - W / 2) * scale
          );
          dummy.updateMatrix();
          inst.setMatrixAt(idx, dummy.matrix);
        });
        group.add(inst);
      }
    }
  }, [packResult, summaries, outerL, outerW, outerH, wireframeMode, visibleCount, isPlaying]);

  return (
    <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 dark:bg-slate-950 relative overflow-hidden select-none">
      {/* Top Floating Metric Bar */}
      {packResult && hasCalculated ? (
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 glass-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          {/* Metric 1: Count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Yüklenen Kutu
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {visibleCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {totalBoxes} adet
                </span>
                {currentActiveLayer && (
                  <span className="ml-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    Kat {currentActiveLayer.layerIndex} / {layers.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metric 2: Efficiency Bar */}
          <div className="flex-1 max-w-xs px-2 hidden sm:block">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Doluluk Oranı
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                %{formatNumber(packResult.efficiency)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full transition-all duration-300"
                style={{
                  width: `${totalBoxes > 0 ? (visibleCount / totalBoxes) * packResult.efficiency : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Metric 3: Volume & Quick Export Buttons */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Dolu Hacim
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {toLiters(packResult.usedVolume * (visibleCount / (totalBoxes || 1)))}
              </span>
            </div>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            {/* Quick Export in Viewport */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
                title="Kat Kat Yükleme Rehberi PDF İndir"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">PDF Rehber</span>
              </button>

              <button
                type="button"
                disabled={isRecordingVideo}
                onClick={handleRecordVideo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                  isRecordingVideo
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Yükleme Animasyonunu Video (WebM) Olarak İndir"
              >
                {isRecordingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>%{recordingProgress}</span>
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 text-sky-500" />
                    <span className="hidden sm:inline">Video Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Layer Milestone Banner (Appears when a layer is completed) */}
      {layerNotice && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white border border-sky-400/30 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{layerNotice}</span>
          </div>
        </div>
      )}

      {/* Recording Video Modal / Banner */}
      {isRecordingVideo && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Yükleme Animasyonu Kaydediliyor
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Kutular sırayla kat kat yüklenirken 3D WebGL sahnesi video dosyası olarak yakalanıyor.
            </p>
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span>Kutu {visibleCount} / {totalBoxes}</span>
              <span>%{recordingProgress}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas Area */}
      <div
        id="canvas-holder"
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing"
      >
        {/* Empty State Overlay */}
        {!hasCalculated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4">
              <Box className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              3D Yük Yerleşim Simülatörü
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
              Sol menüden konteyner ve kutu ölçülerini seçin, kat kat yükleme animasyonunu izleyin ve PDF / Video olarak dışa aktarın.
            </p>
            <button
              type="button"
              onClick={onLoadSample}
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Hızlı Örneği Yükle & Başlat</span>
            </button>
          </div>
        )}

        {/* Floating Animation & Viewport Control Panel (Bottom) */}
        {hasCalculated && totalBoxes > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
            {/* Main Animation Controller Bar */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-2 glass-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg text-xs w-full sm:w-auto">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => {
                  if (visibleCount >= totalBoxes) {
                    setVisibleCount(0);
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
                title={isPlaying ? 'Animasyonu Duraklat' : 'Animasyonu Oynat'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              {/* Rewind */}
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setVisibleCount(0);
                  setLayerNotice(null);
                }}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Başa Sar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Step Back / Step Forward */}
              <div className="flex items-center gap-0.5 border-x border-slate-200 dark:border-slate-800 px-1">
                <button
                  type="button"
                  disabled={visibleCount <= 0}
                  onClick={() => {
                    setIsPlaying(false);
                    setVisibleCount((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  title="Bir Kutu Geri"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={visibleCount >= totalBoxes}
                  onClick={() => {
                    setIsPlaying(false);
                    setVisibleCount((prev) => Math.min(totalBoxes, prev + 1));
                  }}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  title="Bir Kutu İleri"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrubber Range Slider */}
              <div className="flex items-center gap-2 px-1 min-w-[130px] sm:min-w-[160px] flex-1 sm:flex-initial">
                <input
                  type="range"
                  min="0"
                  max={totalBoxes}
                  value={visibleCount}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setVisibleCount(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-sky-600 cursor-pointer h-1.5"
                />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                  {visibleCount}/{totalBoxes}
                </span>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-1.5">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaySpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      playSpeed === spd
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Show All Button */}
              {visibleCount < totalBoxes && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setVisibleCount(totalBoxes);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors"
                  title="Tüm kutuları yerleştir"
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Bitir</span>
                </button>
              )}
            </div>

            {/* Quick Layer Jump Badges & Camera toolbar */}
            <div className="pointer-events-auto flex items-center gap-2 p-1.5 glass-panel border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg text-xs">
              {/* Layers List */}
              <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 hidden md:inline">
                  Katlar:
                </span>
                {layers.map((layer) => {
                  const isActive = currentActiveLayer?.layerIndex === layer.layerIndex;
                  return (
                    <button
                      key={layer.layerIndex}
                      type="button"
                      onClick={() => jumpToLayer(layer)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={`Kat ${layer.layerIndex}: ${layer.boxCount} Kutu (Z: ${Math.round(layer.minZ)} - ${Math.round(layer.maxZ)} mm)`}
                    >
                      Kat {layer.layerIndex}
                    </button>
                  );
                })}
              </div>

              {/* Camera Views */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewAngle('iso')}
                  className="px-2 py-1 font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="İzometrik 3D Görünüm"
                >
                  3D
                </button>
                <button
                  type="button"
                  onClick={() => setViewAngle('top')}
                  className="px-2 py-1 font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Kuşbakışı (Üstten) Görünüm"
                >
                  Üst
                </button>
                <button
                  type="button"
                  onClick={resetCamera}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Kamerayı Sıfırla"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWireframeMode((prev) => !prev)}
                  className={`p-1 rounded-lg transition-colors ${
                    wireframeMode
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Tel Kafes Görünümü"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Orientation & Loading Stats Bar */}
      {hasCalculated && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2.5 shrink-0 flex items-center justify-between gap-4 overflow-x-auto text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 shrink-0 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Yönelimler:
            </span>
            {summaries.length === 0 ? (
              <span className="text-slate-400">Uygun yerleşim bulunamadı</span>
            ) : (
              summaries.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatNumber(s.dx, 0)} × {formatNumber(s.dy, 0)} × {formatNumber(s.dz, 0)} mm
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {s.count} adet
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    (%{formatNumber(s.percentage, 0)})
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Kutu sırası: Taban Kat 1'den başlayıp tavana doğru kademelendirilir</span>
          </div>
        </div>
      )}
    </main>
  );
};
