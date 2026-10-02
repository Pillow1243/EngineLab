import * as THREE from 'three';

/** Shared PBR materials — created once, reused across the model. */
export const MAT = {
  block: new THREE.MeshStandardMaterial({ color: '#2b3442', metalness: 0.85, roughness: 0.38 }),
  blockDark: new THREE.MeshStandardMaterial({ color: '#1a212c', metalness: 0.8, roughness: 0.45 }),
  alu: new THREE.MeshStandardMaterial({ color: '#8b98a8', metalness: 0.9, roughness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: '#5b6675', metalness: 0.95, roughness: 0.28 }),
  steelDark: new THREE.MeshStandardMaterial({ color: '#39424f', metalness: 0.9, roughness: 0.35 }),
  piston: new THREE.MeshStandardMaterial({ color: '#b8c2cf', metalness: 0.92, roughness: 0.25 }),
  rod: new THREE.MeshStandardMaterial({ color: '#7d8a99', metalness: 0.9, roughness: 0.3 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#15181d', metalness: 0.1, roughness: 0.85 }),
  liner: new THREE.MeshPhysicalMaterial({
    color: '#7dd3fc',
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: '#3a3f47',
    metalness: 0.85,
    roughness: 0.5,
    emissive: new THREE.Color('#ff5a1f'),
    emissiveIntensity: 0,
  }),
  cover: new THREE.MeshStandardMaterial({ color: '#232b37', metalness: 0.7, roughness: 0.42 }),
  intake: new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.35 }),
  turbo: new THREE.MeshStandardMaterial({
    color: '#4b5563',
    metalness: 0.9,
    roughness: 0.32,
    emissive: new THREE.Color('#ff6a00'),
    emissiveIntensity: 0,
  }),
};
