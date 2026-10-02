import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Shared engine geometry constants (inline-5, crank axis = X)        */
/* ------------------------------------------------------------------ */
export const CRANK_Y = 0.34; // crank centerline height
export const R = 0.1; // crank throw (half stroke)
export const L = 0.29; // connecting rod length
export const XS = [-0.64, -0.32, 0, 0.32, 0.64]; // cylinder positions
// Crank-pin phases for the BMW-style inline-5 (firing order 1-2-4-5-3)
export const PHASES = [0, 144, 216, 288, 72]; // degrees
export const DEG = Math.PI / 180;

/* Shared mutable crank angles keep the visible parts and cylinder sequencer phase-locked. */
export const visualAngle = { value: 0 };
export const engineCycleAngle = { value: 0 };
