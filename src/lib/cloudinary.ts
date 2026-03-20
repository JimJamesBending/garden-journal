/**
 * Cloudinary URL transform helpers
 * All transforms are URL-based — zero client-side processing cost.
 */

const CLOUD_NAME = "davterbwx";

type TransformOptions = {
  width?: number;
  height?: number;
  crop?: "auto" | "fill" | "fit" | "thumb" | "scale";
  gravity?: "auto" | "face" | "center";
  quality?: "auto" | number;
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  autoRotate?: boolean;
  autoEnhance?: boolean;
  blur?: number;
  aspectRatio?: string;
};

function buildTransformString(opts: TransformOptions): string {
  const parts: string[] = [];

  if (opts.autoRotate !== false) parts.push("a_auto");
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (opts.gravity) parts.push(`g_${opts.gravity}`);
  if (opts.aspectRatio) parts.push(`ar_${opts.aspectRatio}`);
  if (opts.blur) parts.push(`e_blur:${opts.blur}`);
  if (opts.autoEnhance) {
    parts.push("e_auto_color");
    parts.push("e_auto_brightness");
    parts.push("e_auto_contrast");
  }
  parts.push(`q_${opts.quality || "auto"}`);
  parts.push(`f_${opts.format || "auto"}`);

  return parts.join(",");
}

/**
 * Transform a Cloudinary URL by inserting transformation params.
 * Input: https://res.cloudinary.com/davterbwx/image/upload/v123/abc.jpg
 * Output: https://res.cloudinary.com/davterbwx/image/upload/a_auto,w_800,c_fill,.../v123/abc.jpg
 */
export function transformUrl(
  url: string,
  opts: TransformOptions = {}
): string {
  if (!url || !url.includes("cloudinary.com")) return url;

  const transform = buildTransformString(opts);
  // Insert transform between /upload/ and /v{timestamp}/
  return url.replace(
    /\/upload\//,
    `/upload/${transform}/`
  );
}

// --- Preset transforms ---

/** Auto-rotated, auto-enhanced, auto-format, full quality */
export function autoEnhance(url: string): string {
  return transformUrl(url, {
    autoRotate: true,
    autoEnhance: true,
  });
}

/** Hero/card image — landscape crop, 800px wide */
export function heroImage(url: string): string {
  return transformUrl(url, {
    width: 800,
    height: 600,
    crop: "fill",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Thumbnail — square, 200px */
export function thumbnail(url: string): string {
  return transformUrl(url, {
    width: 200,
    height: 200,
    crop: "fill",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Gallery image — max 1200px wide, maintain aspect ratio */
export function galleryImage(url: string): string {
  return transformUrl(url, {
    width: 1200,
    crop: "fit",
    autoEnhance: true,
  });
}

/** Timeline image — 600px wide, auto-crop */
export function timelineImage(url: string): string {
  return transformUrl(url, {
    width: 600,
    crop: "auto",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Blur-up placeholder — tiny, heavily blurred */
export function blurPlaceholder(url: string): string {
  return transformUrl(url, {
    width: 40,
    crop: "scale",
    blur: 800,
    quality: 30,
  });
}

/** Responsive srcSet for <img> or next/image */
export function srcSet(
  url: string,
  widths: number[] = [400, 600, 800, 1200]
): string {
  return widths
    .map((w) => {
      const transformed = transformUrl(url, {
        width: w,
        crop: "fit",
        autoEnhance: true,
      });
      return `${transformed} ${w}w`;
    })
    .join(", ");
}

/** OG/social sharing image — 1200x630 */
export function ogImage(url: string): string {
  return transformUrl(url, {
    width: 1200,
    height: 630,
    crop: "fill",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Full-bleed hero background — wide, heavily blurred */
export function heroBackground(url: string): string {
  return transformUrl(url, {
    width: 1920,
    height: 1080,
    crop: "fill",
    gravity: "auto",
    blur: 400,
    quality: 60,
  });
}

/** Hero foreground — sharp, centred subject */
export function heroForeground(url: string): string {
  return transformUrl(url, {
    width: 900,
    height: 700,
    crop: "fill",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Showcase strip — portrait-ish, medium size */
export function showcaseImage(url: string): string {
  return transformUrl(url, {
    width: 400,
    height: 500,
    crop: "fill",
    gravity: "auto",
    autoEnhance: true,
  });
}

/** Plant card background — blurred for text overlay */
export function cardBackground(url: string): string {
  return transformUrl(url, {
    width: 600,
    height: 400,
    crop: "fill",
    gravity: "auto",
    blur: 600,
    quality: 40,
  });
}
