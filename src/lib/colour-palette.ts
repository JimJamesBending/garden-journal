/**
 * Dynamic colour palette extraction from garden photos.
 *
 * Uses the dominant colours from actual plant/greenhouse photos
 * to generate a living palette. Falls back to the static
 * moss/parchment theme when no photos are available.
 *
 * Inspired by Copic marker earth-tone palettes (E-series):
 * natural greens, warm browns, sun-bleached creams.
 */

export interface GardenPalette {
  /** Dominant green from plant foliage */
  primary: string;
  /** Warm accent from flowers/soil */
  secondary: string;
  /** Highlight — brightest colour from photos */
  accent: string;
  /** Darkened primary for backgrounds */
  background: string;
  /** Lightened secondary for text */
  foreground: string;
  /** Source: "photo" if extracted, "default" if fallback */
  source: "photo" | "default";
}

/** Static fallback — current moss/parchment theme */
const DEFAULT_PALETTE: GardenPalette = {
  primary: "#2d6b2d",     // moss-500
  secondary: "#c4a05a",   // parchment-500
  accent: "#4a8a4a",      // moss-400
  background: "#0a1f0a",  // moss-950
  foreground: "#e8d5b0",  // parchment-300
  source: "default",
};

/**
 * Darken a hex colour by a factor (0-1).
 */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * (1 - factor)).toString(16).padStart(2, "0")}${Math.round(g * (1 - factor)).toString(16).padStart(2, "0")}${Math.round(b * (1 - factor)).toString(16).padStart(2, "0")}`;
}

/**
 * Lighten a hex colour by a factor (0-1).
 */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, "0")}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, "0")}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, "0")}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Build a palette from extracted RGB colours.
 * Expects an array of [r, g, b] values (e.g. from colorthief).
 */
export function buildPaletteFromColors(
  colors: [number, number, number][]
): GardenPalette {
  if (!colors || colors.length < 3) return DEFAULT_PALETTE;

  const primary = rgbToHex(colors[0][0], colors[0][1], colors[0][2]);
  const secondary = rgbToHex(colors[1][0], colors[1][1], colors[1][2]);
  const accent = rgbToHex(colors[2][0], colors[2][1], colors[2][2]);

  return {
    primary,
    secondary,
    accent,
    background: darken(primary, 0.75),
    foreground: lighten(secondary, 0.6),
    source: "photo",
  };
}

/**
 * Get the default palette (used when no photos are available
 * or as an SSR fallback before client-side extraction).
 */
export function getDefaultPalette(): GardenPalette {
  return DEFAULT_PALETTE;
}

/**
 * Convert a palette to CSS custom properties string.
 * Apply with element.style.cssText or a <style> tag.
 */
export function paletteToCssVars(palette: GardenPalette): string {
  return [
    `--garden-primary: ${palette.primary}`,
    `--garden-secondary: ${palette.secondary}`,
    `--garden-accent: ${palette.accent}`,
    `--garden-bg: ${palette.background}`,
    `--garden-fg: ${palette.foreground}`,
  ].join("; ");
}

/**
 * Nearest Pro Marker / Copic hue mapping.
 *
 * Given an RGB value, find the nearest colour in the
 * Copic E-series (earth tones) palette. Used for
 * generating consistent "natural" colour descriptions.
 */
const COPIC_EARTH_TONES: Record<string, [number, number, number]> = {
  "E00 Cotton Pearl": [255, 245, 230],
  "E11 Barley Beige": [240, 220, 185],
  "E21 Soft Sun": [245, 225, 165],
  "E31 Brick Beige": [220, 190, 140],
  "E34 Orientale": [200, 165, 100],
  "E37 Sepia": [180, 130, 70],
  "E39 Leather": [155, 100, 50],
  "E49 Dark Bark": [100, 60, 30],
  "YG13 Chartreuse": [180, 210, 100],
  "YG17 Grass Green": [100, 170, 60],
  "G14 Apple Green": [130, 190, 80],
  "G28 Ocean Green": [0, 120, 80],
  "BG10 Cool Shadow": [200, 230, 220],
};

export function nearestCopicName(r: number, g: number, b: number): string {
  let nearest = "E31 Brick Beige";
  let minDist = Infinity;

  for (const [name, [cr, cg, cb]] of Object.entries(COPIC_EARTH_TONES)) {
    const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }

  return nearest;
}
