import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Box,
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
  Grid,
  Sparkles,
  Sun,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  X,
  Palette,
  Shuffle,
} from 'lucide-react';
import { PackResult, OrientationSummary, LayerInfo, Language, EnvironmentMode, PaletteMode } from '../types';
import { formatNumber, toLiters } from '../solver/packer';
import { startCanvasRecording, downloadBlob } from '../utils/videoRecorder';
import { useTranslation } from '../i18n/translations';
import { Orientation3DCard } from './Orientation3DCard';

interface ThreeViewportProps {
  theme?: 'dark' | 'light';
  language: Language;
  paletteMode: PaletteMode;
  onPaletteModeChange: (mode: PaletteMode) => void;
  onShuffleColors: () => void;
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
  theme,
  language,
  paletteMode,
  onPaletteModeChange,
  onShuffleColors,
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
  const t = useTranslation(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Camera orbit state
  const azimuthRef = useRef<number>(0.75);
  const polarRef = useRef<number>(1.1);
  const radiusRef = useRef<number>(12);
  const camTargetYRef = useRef<number>(2);
  const draggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);

  // Viewport & Lighting Settings (Defaults: Grid enabled, Object Shadows off, Specular Reflections off)
  const [environmentMode, setEnvironmentMode] = useState<EnvironmentMode>('grid'); // 'grid' | 'photobooth'
  const [objectShadows, setObjectShadows] = useState<boolean>(false);
  const [specularReflection, setSpecularReflection] = useState<boolean>(false);
  const [showEnvDropdown, setShowEnvDropdown] = useState<boolean>(false);

  // Bottom Orientations 3D Drawer State (default: collapsed)
  const [isOrientationsExpanded, setIsOrientationsExpanded] = useState<boolean>(false);
  const isDark = theme ? theme === 'dark' : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Animation Playback State
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [layerNotice, setLayerNotice] = useState<string | null>(null);
  const [isLayerTransitioning, setIsLayerTransitioning] = useState<boolean>(false);

  const totalBoxes = packResult ? packResult.sortedPlacements.length : 0;
  const layers = packResult ? packResult.layers : [];

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

  // Update shadow mapping dynamically
  useEffect(() => {
    if (keyLightRef.current) {
      keyLightRef.current.castShadow = objectShadows;
    }
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = objectShadows;
    }
  }, [objectShadows]);

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
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;

    container.appendChild(renderer.domElement);

    // Studio lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    ambientLightRef.current = amb;
    scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(9, 16, 11);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0004;
    keyLightRef.current = keyLight;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.35);
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
      setLayerNotice(t.allCompletedNotice(totalBoxes));
      return;
    }

    const baseInterval = 140 / playSpeed;

    const timer = setTimeout(() => {
      const nextCount = visibleCount + 1;
      const completedLayer = layers.find((l) => l.endIndex + 1 === nextCount);

      if (completedLayer) {
        const isLastLayer = completedLayer.layerIndex === layers.length;
        setLayerNotice(
          t.layerCompletedNotice(
            completedLayer.layerIndex,
            completedLayer.boxCount,
            isLastLayer ? undefined : completedLayer.layerIndex + 1
          )
        );

        setIsLayerTransitioning(true);
        setVisibleCount(nextCount);

        setTimeout(() => {
          setIsLayerTransitioning(false);
        }, 650 / playSpeed);
      } else {
        setVisibleCount(nextCount);
      }
    }, isLayerTransitioning ? (700 / playSpeed) : baseInterval);

    return () => clearTimeout(timer);
  }, [isPlaying, visibleCount, totalBoxes, playSpeed, packResult, layers, isLayerTransitioning, isRecordingVideo, t]);

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
      setVisibleCount(0);
      setLayerNotice(null);
      await new Promise((r) => setTimeout(r, 400));

      const stepDelay = Math.max(40, Math.min(100, Math.round(2500 / totalBoxes)));

      for (let i = 1; i <= totalBoxes; i++) {
        setVisibleCount(i);
        const progress = Math.round((i / totalBoxes) * 100);
        setRecordingProgress(progress);

        const completedLayer = layers.find((l) => l.endIndex + 1 === i);
        if (completedLayer) {
          const isLast = completedLayer.layerIndex === layers.length;
          setLayerNotice(
            t.layerCompletedNotice(
              completedLayer.layerIndex,
              completedLayer.boxCount,
              isLast ? undefined : completedLayer.layerIndex + 1
            )
          );
          await new Promise((r) => setTimeout(r, 450));
        } else {
          await new Promise((r) => setTimeout(r, stepDelay));
        }
      }

      await new Promise((r) => setTimeout(r, 900));

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
  }, [packResult, totalBoxes, layers, outerL, outerW, outerH, setIsRecordingVideo, setRecordingProgress, t]);

  useEffect(() => {
    if (onRegisterRecordTrigger) {
      onRegisterRecordTrigger(handleRecordVideo);
    }
  }, [onRegisterRecordTrigger, handleRecordVideo]);

  const jumpToLayer = (layer: LayerInfo) => {
    setIsPlaying(false);
    setVisibleCount(layer.endIndex + 1);
    setLayerNotice(`${t.hudLayer} ${layer.layerIndex} (${layer.boxCount} ${t.hudTotalBoxes})`);
  };

  // Build Scene Geometries
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

    // Directional shadow tuning for sharp inner self-shadowing between boxes
    if (keyLightRef.current) {
      const bound = Math.max(L * scale, W * scale, H * scale) * 1.2;
      const kl = keyLightRef.current;
      kl.position.set(bound * 1.8, bound * 2.6, bound * 1.8);
      kl.shadow.camera.left = -bound;
      kl.shadow.camera.right = bound;
      kl.shadow.camera.top = bound;
      kl.shadow.camera.bottom = -bound;
      kl.shadow.camera.near = 0.5;
      kl.shadow.camera.far = bound * 6;
      kl.shadow.bias = -0.0004;
      kl.shadow.normalBias = 0.025;
      kl.shadow.camera.updateProjectionMatrix();
    }

    // Environment: Grid or Seamless Void Photo Booth
    const gridDim = Math.max(L, W) * scale * 1.5;

    if (environmentMode === 'grid') {
      const gridHelper = new THREE.GridHelper(gridDim, 16, 0x94a3b8, 0x64748b);
      gridHelper.position.y = 0;
      (gridHelper.material as THREE.Material).transparent = true;
      (gridHelper.material as THREE.Material).opacity = 0.22;
      (gridHelper.material as THREE.Material).depthWrite = false;
      gridHelper.renderOrder = -2;
      group.add(gridHelper);
    }
    // In Photo Booth mode: NO ground disc, NO grid, NO pedestal. Infinite seamless void!

    // Color map
    const colorMap: Record<string, string> = {};
    for (const item of summaries) {
      colorMap[item.key] = item.color;
    }

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
          roughness: specularReflection ? 0.22 : 1.0,
          metalness: specularReflection ? 0.12 : 0.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        // Inter-box self shadows (boxes shadow each other, no ground shadow)
        mesh.castShadow = objectShadows;
        mesh.receiveShadow = objectShadows;
        mesh.renderOrder = 1;
        mesh.position.set(
          (p.x + p.dx / 2 - L / 2) * scale,
          (p.z + p.dz / 2) * scale,
          (p.y + p.dy / 2 - W / 2) * scale
        );
        group.add(mesh);

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
      });
    } else {
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
          roughness: specularReflection ? 0.22 : 1.0,
          metalness: specularReflection ? 0.12 : 0.0,
        });
        const inst = new THREE.InstancedMesh(geo, mat, o.items.length);
        inst.castShadow = objectShadows;
        inst.receiveShadow = objectShadows;
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
  }, [packResult, summaries, outerL, outerW, outerH, visibleCount, isPlaying, environmentMode, objectShadows, specularReflection]);

  return (
    <main
      className={`flex-1 flex flex-col h-full min-w-0 relative overflow-hidden select-none transition-colors duration-300 ${
        environmentMode === 'photobooth'
          ? 'bg-white dark:bg-[#070a10]'
          : 'bg-gradient-to-b from-slate-100/70 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950'
      }`}
    >
      {/* Top Floating Metric Bar */}
      {packResult && hasCalculated ? (
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 apple-glass rounded-2xl shadow-sm">
          {/* Metric 1: Count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-400/20 shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t.hudLoadedBoxes}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {visibleCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {totalBoxes} {t.hudTotalBoxes}
                </span>
                {currentActiveLayer && (
                  <span className="ml-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-400/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                    {t.hudLayer} {currentActiveLayer.layerIndex} / {layers.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metric 2: Efficiency Bar */}
          <div className="flex-1 max-w-xs px-2 hidden sm:block">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {t.hudEfficiency}
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                %{formatNumber(packResult.efficiency)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
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
                {t.hudFilledVol}
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
                className="flex items-center gap-1.5 px-3 py-1.5 apple-glass-card hover:bg-white dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
                title={t.pdfExport}
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{t.pdfExport}</span>
              </button>

              <button
                type="button"
                disabled={isRecordingVideo}
                onClick={handleRecordVideo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                  isRecordingVideo
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'apple-glass-card hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
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
            </div>
          </div>
        </div>
      ) : null}

      {/* Layer Milestone Banner */}
      {layerNotice && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2.5 apple-glass text-slate-900 dark:text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-sky-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{layerNotice}</span>
          </div>
        </div>
      )}

      {/* Recording Video Modal */}
      {isRecordingVideo && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
          <div className="p-6 apple-glass rounded-3xl shadow-2xl max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t.videoRecordingModalTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t.videoRecordingModalDesc}
            </p>
            <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span>{t.hudLoadedBoxes} {visibleCount} / {totalBoxes}</span>
              <span>%{recordingProgress}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas Area */}
      <div
        id="canvas-holder"
        ref={containerRef}
        className="flex-1 min-h-0 w-full relative cursor-grab active:cursor-grabbing overflow-hidden transition-[height,flex] duration-300 ease-out"
      >
        {/* Initial Uncalculated Hero Screen with User's Uploaded Mobiqu Fleet Image */}
        {!hasCalculated && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* The Background Mobiqu Fleet Image */}
            <img
              src="./assets/aistudio/image_da845260.png"
              alt="Mobiqu Thermal Packaging Fleet"
              className="absolute inset-0 w-full h-full object-cover object-center filter dark:brightness-[0.78] transition-all duration-700 select-none pointer-events-none"
            />

            {/* Subtle Gradient Vignette to keep card text & button perfectly readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-slate-950/40 pointer-events-none" />

            {/* Floating Apple Glass Showcase Card */}
            <div className="relative z-10 max-w-lg mx-auto p-6 sm:p-8 apple-glass rounded-3xl shadow-2xl text-center border border-white/70 dark:border-white/10 animate-in fade-in zoom-in-95">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 dark:bg-sky-400/15 border border-sky-400/30 text-sky-600 dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>MOBIQU PASSIVE & ACTIVE THERMAL FLEET</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {t.emptyTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-5 leading-relaxed font-medium">
                {t.emptyDesc}
              </p>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.emptyBtn}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Viewport & Environment Controls Toolbar (Top Right) */}
        {hasCalculated && (
          <div className="absolute top-26 sm:top-24 right-4 z-20 flex flex-col items-end gap-2">
            {/* Environment & Lighting Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEnvDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 apple-glass rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                title={t.envButton}
              >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.envButton}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showEnvDropdown && (
              <div className="absolute right-0 top-10 w-60 apple-glass rounded-2xl shadow-xl p-3 text-xs z-30 border border-white/60 dark:border-white/10 space-y-3 animate-in fade-in zoom-in-95">
                {/* Environment Mode: Grid vs Photo Booth */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    {t.envButton}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300/30 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => setEnvironmentMode('grid')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        environmentMode === 'grid'
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Grid className="w-3 h-3" />
                      <span>{t.envGrid}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironmentMode('photobooth')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        environmentMode === 'photobooth'
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{t.envPhotobooth}</span>
                    </button>
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-sky-500" />
                    {t.paletteButton}
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300/30 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => onPaletteModeChange('vibrant')}
                      className={`py-1 rounded-lg font-bold text-[10px] transition-all text-center cursor-pointer ${
                        paletteMode === 'vibrant'
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t.paletteVibrant}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPaletteModeChange('pastel')}
                      className={`py-1 rounded-lg font-bold text-[10px] transition-all text-center cursor-pointer ${
                        paletteMode === 'pastel'
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t.palettePastel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPaletteModeChange('monochrome')}
                      className={`py-1 rounded-lg font-bold text-[10px] transition-all text-center cursor-pointer ${
                        paletteMode === 'monochrome'
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t.paletteMonochrome}
                    </button>
                  </div>
                </div>

                {/* Object Shadows Toggle (Inter-Box Self Shadows) */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {t.shadowsButton}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setObjectShadows((prev) => !prev)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      objectShadows
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {objectShadows ? t.on : t.off}
                  </button>
                </div>

                {/* Specular Reflection (Işık Yansıması) Toggle */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {t.reflectionButton}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpecularReflection((prev) => !prev)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      specularReflection
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {specularReflection ? t.on : t.off}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Floating Animation & Viewport Control Panel (Bottom) */}
        {hasCalculated && totalBoxes > 0 && (
          <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none transition-all duration-300">
            {/* Main Animation Controller Bar */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-2 apple-glass rounded-2xl shadow-lg text-xs w-full sm:w-auto">
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
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white flex items-center justify-center shadow-xs transition-all shrink-0 active:scale-95"
                title={isPlaying ? t.animPause : t.animPlay}
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
                className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-all"
                title={t.animRewind}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Step Back / Step Forward */}
              <div className="flex items-center gap-0.5 border-x border-slate-300/40 dark:border-slate-800 px-1">
                <button
                  type="button"
                  disabled={visibleCount <= 0}
                  onClick={() => {
                    setIsPlaying(false);
                    setVisibleCount((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
                  title={t.animStepBack}
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
                  className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
                  title={t.animStepForward}
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
              <div className="flex items-center gap-1 border-l border-slate-300/40 dark:border-slate-800 pl-1.5">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaySpeed(spd)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      playSpeed === spd
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800'
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all shadow-2xs"
                  title={t.animFinish}
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>{t.animFinish}</span>
                </button>
              )}
            </div>

            {/* Quick Layer Jump Badges & Camera toolbar */}
            <div className="pointer-events-auto flex items-center gap-2 p-1.5 apple-glass rounded-2xl shadow-lg text-xs">
              {/* Layers List */}
              <div className="flex items-center gap-1 border-r border-slate-300/40 dark:border-slate-800 pr-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 hidden md:inline">
                  {t.layersLabel}
                </span>
                {layers.map((layer) => {
                  const isActive = currentActiveLayer?.layerIndex === layer.layerIndex;
                  return (
                    <button
                      key={layer.layerIndex}
                      type="button"
                      onClick={() => jumpToLayer(layer)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                      title={`${t.hudLayer} ${layer.layerIndex}: ${layer.boxCount} ${t.hudTotalBoxes} (Z: ${Math.round(layer.minZ)} - ${Math.round(layer.maxZ)} mm)`}
                    >
                      {t.hudLayer} {layer.layerIndex}
                    </button>
                  );
                })}
              </div>

              {/* Camera Views */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewAngle('iso')}
                  className="px-2 py-1 font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800 transition-all"
                  title={t.view3D}
                >
                  {t.view3D}
                </button>
                <button
                  type="button"
                  onClick={() => setViewAngle('top')}
                  className="px-2 py-1 font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800 transition-all"
                  title={t.viewTop}
                >
                  {t.viewTop}
                </button>
                <button
                  type="button"
                  onClick={resetCamera}
                  className="p-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800 transition-all"
                  title={t.viewReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onShuffleColors}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 transition-all font-semibold text-xs apple-glass-card shadow-2xs cursor-pointer active:scale-95"
                  title={t.shuffleColorsDesc}
                >
                  <Shuffle className="w-3.5 h-3.5 text-sky-500" />
                  <span className="hidden sm:inline">
                    {t.shuffleColors}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Orientation & 3D Isometric Previews Drawer */}
      {hasCalculated && (
        <div className="border-t border-white/60 dark:border-white/10 apple-glass shrink-0 transition-all duration-300">
          {/* Expanded Drawer: Shows static 3D isometric model render cards for each orientation */}
          {isOrientationsExpanded && (
            <div className="px-4 py-2.5 border-b border-white/40 dark:border-white/10 animate-in slide-in-from-bottom-2 duration-300 max-h-[250px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 shadow-2xs">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                      {t.orientationsDetailTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.orientationsDetailDesc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOrientationsExpanded(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
                  title={t.collapseOrientations}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {summaries.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {t.noPlacement}
                </div>
              ) : (
                <div className="flex items-stretch gap-3 overflow-x-auto pb-1 pt-1">
                  {summaries.map((s, idx) => (
                    <Orientation3DCard
                      key={s.key}
                      summary={s}
                      index={idx}
                      language={language}
                      isDark={isDark}
                      specular={specularReflection}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Bar: Expand/Collapse Arrow Button + Summaries + Sequence Tip */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs">
            <div className="flex items-center gap-3">
              {/* Upward / Downward Toggle Button */}
              <button
                type="button"
                onClick={() => setIsOrientationsExpanded((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isOrientationsExpanded
                    ? 'bg-sky-500 text-white shadow-sky-500/20'
                    : 'apple-glass-card hover:bg-white/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                title={isOrientationsExpanded ? t.collapseOrientations : t.expandOrientations}
              >
                <ChevronUp
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isOrientationsExpanded ? 'rotate-180 text-white' : 'text-sky-500'
                  }`}
                />
                <span>{t.orientationsLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isOrientationsExpanded
                      ? 'bg-white/20 text-white'
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {summaries.length}
                </span>
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-400 hidden sm:inline ml-0.5">
                  ({isOrientationsExpanded ? t.collapseOrientations : t.expandOrientations})
                </span>
              </button>

              {/* In collapsed mode: Compact Summary Chips */}
              {summaries.length === 0 ? (
                <span className="text-slate-400">{t.noPlacement}</span>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto">
                  {summaries.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setIsOrientationsExpanded(true)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-xl apple-glass-card hover:bg-white/70 dark:hover:bg-slate-800/80 transition text-left cursor-pointer shrink-0"
                      title={t.expandOrientations}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        {formatNumber(s.dx, 0)} × {formatNumber(s.dy, 0)} × {formatNumber(s.dz, 0)} mm
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {s.count} {t.hudTotalBoxes}
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        (%{formatNumber(s.percentage, 0)})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.orderTip}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
