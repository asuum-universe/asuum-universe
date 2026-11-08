/** header-color-store.ts — Shared cinematic color store */

export interface CinematicColor {
  tint: string;
  'tint-hover': string;
  'tint-active': string;
  dot: string;
  border: string;
  text: string;
  'icon-bg': string;
  accent: string;
}

let lastCreatedTabColor: CinematicColor | null = null;

export function setLastCreatedTabColor(c: CinematicColor | null): void {
  lastCreatedTabColor = c;
}

export function getLastCreatedTabColor(): CinematicColor | null {
  return lastCreatedTabColor;
}