import * as THREE from 'three';

// In-memory cache for rendered 3D isometric snapshots
const previewCache = new Map<string, string>();

/**
 * Renders an exact, static 3D isometric snapshot of an inner box.
 * Matches the orientation proportions (dx, dy, dz), palette color,
 * specular reflection, and light/dark theme outlines.
 *
 * Returned as a base64 PNG data URL that can be directly displayed in an <img> tag.
 * Guaranteed to be non-interactive / non-rotatable.
 */
export function getOrientationIsometricImage(
  dx: number,
  dy: number,
  dz: number,
  color: string,
  isDark: boolean = false,
  specular: boolean = false
): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const cacheKey = `${dx}_${dy}_${dz}_${color}_${isDark ? 'dark' : 'light'}_${specular ? 'spec' : 'flat'}`;
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!;
  }

  const size = 240;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();

    // Orthographic camera for true isometric projection
    const aspect = 1;
    const frustumSize = 130;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      -300,
      500
    );

    // True isometric viewpoint (Elevation ~35.26°, Azimuth 45°)
    camera.position.set(100, 81.65, 100);
    camera.lookAt(0, 0, 0);

    // Studio lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(90, 130, 90);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-80, 50, -60);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 100, 0);
    scene.add(rimLight);

    // Proportional dimensions:
    // Three.js coordinates:
    // X axis: dx (width)
    // Y axis: dz (height upright)
    // Z axis: dy (depth)
    const maxDim = Math.max(dx, dy, dz);
    const scale = 58 / (maxDim || 1);

    const boxWidth = dx * scale;
    const boxHeight = dz * scale;
    const boxDepth = dy * scale;

    const geo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: specular ? 0.22 : 0.88,
      metalness: specular ? 0.12 : 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Clean, crisp edge wireframe
    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xffffff : 0x0f172a,
      transparent: true,
      opacity: isDark ? 0.35 : 0.28,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    scene.add(edgeLines);

    renderer.render(scene, camera);
    const dataUrl = canvas.toDataURL('image/png');

    // Clean up WebGL resources
    geo.dispose();
    edges.dispose();
    mat.dispose();
    edgeMat.dispose();
    renderer.dispose();

    previewCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate orientation 3D snapshot:', err);
    if (renderer) {
      try {
        renderer.dispose();
      } catch (_) {}
    }
    return '';
  }
}
