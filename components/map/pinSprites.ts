import type { Map as MapLibreMap } from "maplibre-gl";

export const PIN_PERSON_SPRITE_ID = "cargo-pin-person";
export const PIN_PICKUP_SPRITE_ID = "cargo-pin-pickup";
export const PIN_DROPOFF_SPRITE_ID = "cargo-pin-dropoff";

type PinGlyph = "person" | "destination";

interface PinSpriteConfig {
  id: string;
  fill: string;
  ringColor: string;
  glyph: PinGlyph;
}

const PIN_SPECS: ReadonlyArray<PinSpriteConfig> = [
  {
    id: PIN_PERSON_SPRITE_ID,
    fill: "#0284C7",
    ringColor: "#38BDF8",
    glyph: "person",
  },
  {
    id: PIN_PICKUP_SPRITE_ID,
    fill: "#09090B",
    ringColor: "#10B981",
    glyph: "person",
  },
  {
    id: PIN_DROPOFF_SPRITE_ID,
    fill: "#059669",
    ringColor: "#A7F3D0",
    glyph: "destination",
  },
];

function drawTeardropPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, tipY: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.82, Math.PI * 2.18, false);
  ctx.quadraticCurveTo(cx + r * 0.65, cy + r * 1.15, cx, tipY);
  ctx.quadraticCurveTo(cx - r * 0.65, cy + r * 1.15, cx - r * Math.cos(Math.PI * 0.18), cy + r * Math.sin(Math.PI * 0.18));
  ctx.closePath();
}

function drawPersonGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 8.5, 6.2, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders & standing torso silhouette
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + 12);
  ctx.quadraticCurveTo(cx - 12, cy + 0.5, cx, cy + 0.5);
  ctx.quadraticCurveTo(cx + 12, cy + 0.5, cx + 12, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDestinationGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  // Crisp white pole + destination pennant flag
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 11);
  ctx.lineTo(cx - 7, cy - 11);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(cx - 5.5, cy - 11);
  ctx.lineTo(cx + 11, cy - 5.5);
  ctx.lineTo(cx - 5.5, cy + 0.5);
  ctx.closePath();
  ctx.fill();

  // Base anchor dot
  ctx.beginPath();
  ctx.arc(cx - 7, cy + 11, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderPinSprite(spec: PinSpriteConfig): ImageData {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new ImageData(size, size);
  }

  const cx = 64;
  const cy = 50;
  const r = 30;
  const tipY = 118;

  // Ground contact ellipse beneath pin tip
  ctx.save();
  ctx.fillStyle = "rgba(9, 9, 11, 0.36)";
  ctx.beginPath();
  ctx.ellipse(cx, tipY + 1, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer white halo teardrop border so pin pops off satellite terrain
  drawTeardropPath(ctx, cx, cy, r + 4, tipY + 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Primary teardrop body
  drawTeardropPath(ctx, cx, cy, r, tipY - 3);
  ctx.fillStyle = spec.fill;
  ctx.fill();

  // Inner accent badge ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = spec.ringColor;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  if (spec.glyph === "person") {
    drawPersonGlyph(ctx, cx, cy + 1);
  } else {
    drawDestinationGlyph(ctx, cx, cy);
  }

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Registers high-DPI (`128x128 @2x`) illustrated map pins for live Person GPS,
 * Pickup person marker, and Destination flag marker.
 */
export function registerPinSprites(map: MapLibreMap): void {
  for (const spec of PIN_SPECS) {
    if (!map.hasImage(spec.id)) {
      map.addImage(spec.id, renderPinSprite(spec), { pixelRatio: 2 });
    }
  }
}
