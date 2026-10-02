import * as THREE from 'three';

/** Shared PBR materials — created once, reused across the model. */
export const MAT = {
  block: new THREE.MeshStandardMaterial({
    color: '#2b3442',
    metalness: 0.85,
    roughness: 0.38,
    transparent: false,
    opacity: 1,
  }),
  blockDark: new THREE.MeshStandardMaterial({ color: '#1a212c', metalness: 0.8, roughness: 0.45 }),
  alu: new THREE.MeshStandardMaterial({ color: '#8b98a8', metalness: 0.9, roughness: 0.28 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d8e2ef', metalness: 0.98, roughness: 0.14 }),
  steel: new THREE.MeshStandardMaterial({ color: '#5b6675', metalness: 0.95, roughness: 0.26 }),
  steelDark: new THREE.MeshStandardMaterial({ color: '#39424f', metalness: 0.9, roughness: 0.35 }),
  piston: new THREE.MeshStandardMaterial({ color: '#c4cdd9', metalness: 0.92, roughness: 0.22 }),
  rod: new THREE.MeshStandardMaterial({ color: '#7d8a99', metalness: 0.9, roughness: 0.3 }),
  forgedGold: new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.92, roughness: 0.24 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#15181d', metalness: 0.1, roughness: 0.85 }),
  siliconeBlue: new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.25, roughness: 0.45 }),
  nosBlue: new THREE.MeshStandardMaterial({
    color: '#0ea5e9',
    metalness: 0.88,
    roughness: 0.22,
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 0.12,
  }),
  coilRed: new THREE.MeshStandardMaterial({
    color: '#dc2626',
    metalness: 0.55,
    roughness: 0.32,
    emissive: new THREE.Color('#ef4444'),
    emissiveIntensity: 0.08,
  }),
  brass: new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.88, roughness: 0.28 }),
  bov: new THREE.MeshStandardMaterial({
    color: '#0ea5e9',
    metalness: 0.85,
    roughness: 0.25,
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 0.1,
  }),
  liner: new THREE.MeshPhysicalMaterial({
    color: '#7dd3fc',
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: '#3a3f47',
    metalness: 0.85,
    roughness: 0.5,
    emissive: new THREE.Color('#ff4d00'),
    emissiveIntensity: 0,
  }),
  titanium: new THREE.MeshStandardMaterial({
    color: '#4f46e5',
    metalness: 0.94,
    roughness: 0.24,
    emissive: new THREE.Color('#ff5500'),
    emissiveIntensity: 0,
  }),
  cover: new THREE.MeshStandardMaterial({
    color: '#232b37',
    metalness: 0.72,
    roughness: 0.4,
    transparent: false,
    opacity: 1,
  }),
  intake: new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.8,
    roughness: 0.35,
    transparent: false,
    opacity: 1,
  }),
  turbo: new THREE.MeshStandardMaterial({
    color: '#4b5563',
    metalness: 0.9,
    roughness: 0.32,
    emissive: new THREE.Color('#ff5500'),
    emissiveIntensity: 0,
  }),
};

/** Toggle X-Ray cutaway transparency on outer engine housings. */
export function applyXrayMaterialState(xray) {
  const targets = [
    [MAT.block, 0.18],
    [MAT.cover, 0.16],
    [MAT.intake, 0.24],
  ];
  for (const [m, op] of targets) {
    if (m.transparent !== xray) {
      m.transparent = xray;
      m.opacity = xray ? op : 1;
      m.depthWrite = !xray;
      m.needsUpdate = true;
    }
  }
  MAT.liner.opacity = xray ? 0.32 : 0.18;
}
