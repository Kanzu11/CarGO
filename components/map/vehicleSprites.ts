import type { Map as MapLibreMap } from "maplibre-gl";
import { vehicleSpriteKey } from "@/components/map/vehicleModels";
import { TIER_ORDER } from "@/lib/tiers";
import type { Tier, VehicleStatus } from "@/types/fleet";

const STATUSES: ReadonlyArray<VehicleStatus> = [
  "idle",
  "enroute_pickup",
  "on_trip",
  "offline",
  "alert",
];

const GLASS_COLOR = "#1E293B";
const TIRE_COLOR = "#09090B";
const HEADLIGHT_COLOR = "#FEF9C3";
const TAILLIGHT_COLOR = "#DC2626";
const STROKE_INK = "#111827";
const SHADOW_FILL = "rgba(17, 24, 39, 0.18)";

interface PaletteSpec {
  primary: string;
  secondary: string;
  roof: string;
  rib: string;
}

function paletteFor(tier: Tier, status: VehicleStatus, isPlayerDriver: boolean): PaletteSpec {
  if (status === "on_trip") {
    return { primary: "#047857", secondary: "#065F46", roof: "#059669", rib: "#064E3B" };
  }
  if (status === "enroute_pickup") {
    return { primary: "#D97706", secondary: "#B45309", roof: "#F59E0B", rib: "#92400E" };
  }
  if (status === "alert") {
    return { primary: "#DC2626", secondary: "#991B1B", roof: "#EF4444", rib: "#7F1D1D" };
  }
  if (status === "offline") {
    return { primary: "#9CA3AF", secondary: "#6B7280", roof: "#D1D5DB", rib: "#6B7280" };
  }
  if (isPlayerDriver) {
    return { primary: "#09090B", secondary: "#1F2937", roof: "#18181B", rib: "#3F3F46" };
  }

  // Idle fleet vehicles use realistic Ethiopian street livery colors
  switch (tier) {
    case "bajaj":
      return { primary: "#1F2937", secondary: "#F8F9FA", roof: "#374151", rib: "#111827" };
    case "economy":
      return { primary: "#FFFFFF", secondary: "#E5E7EB", roof: "#F8F9FA", rib: "#CBD5E1" };
    case "minivan":
      return { primary: "#F3F4F6", secondary: "#D1D5DB", roof: "#FFFFFF", rib: "#CBD5E1" };
    case "cargo":
      return { primary: "#374151", secondary: "#FFFFFF", roof: "#4B5563", rib: "#D1D5DB" };
  }
}

function drawSelectionRing(ctx: CanvasRenderingContext2D): void {
  const cx = 64;
  const cy = 64;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#09090B";
  ctx.stroke();

  // Four crisp cardinal tick marks on selection ring
  ctx.fillStyle = "#09090B";
  ctx.fillRect(cx - 2, 3, 4, 8);
  ctx.fillRect(cx - 2, 117, 4, 8);
  ctx.fillRect(3, cy - 2, 8, 4);
  ctx.fillRect(117, cy - 2, 8, 4);
  ctx.restore();
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 1. Bajaj: compact tapered 3-wheeler with front wheel/mudguard & ribbed canopy. */
function drawBajaj(ctx: CanvasRenderingContext2D, pal: PaletteSpec, isShadow: boolean): void {
  const fill = (color: string) => (isShadow ? SHADOW_FILL : color);
  ctx.save();

  // Rear tires
  if (!isShadow) {
    ctx.fillStyle = TIRE_COLOR;
    drawRoundRect(ctx, 41, 76, 6, 15, 2);
    ctx.fill();
    drawRoundRect(ctx, 81, 76, 6, 15, 2);
    ctx.fill();
    // Front central wheel protruding forward
    drawRoundRect(ctx, 60.5, 22, 7, 13, 3);
    ctx.fill();
  }

  // Tapered front cowling + nose
  ctx.beginPath();
  ctx.moveTo(64, 28);
  ctx.quadraticCurveTo(75, 31, 78, 46);
  ctx.lineTo(84, 52);
  ctx.lineTo(44, 52);
  ctx.lineTo(50, 46);
  ctx.quadraticCurveTo(53, 31, 64, 28);
  ctx.closePath();
  ctx.fillStyle = fill(pal.secondary);
  ctx.fill();
  if (!isShadow) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();
  }

  // Wider rounded rear passenger canopy
  drawRoundRect(ctx, 43, 49, 42, 46, [8, 8, 12, 12]);
  ctx.fillStyle = fill(pal.primary);
  ctx.fill();
  if (!isShadow) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();

    // Central round Bajaj headlamp
    ctx.beginPath();
    ctx.arc(64, 32, 3.3, 0, Math.PI * 2);
    ctx.fillStyle = HEADLIGHT_COLOR;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();

    // Curved front windshield
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.quadraticCurveTo(64, 41, 78, 50);
    ctx.lineTo(75, 57);
    ctx.quadraticCurveTo(64, 52, 53, 57);
    ctx.closePath();
    ctx.fillStyle = GLASS_COLOR;
    ctx.fill();

    // Canopy roof ribs
    ctx.strokeStyle = pal.rib;
    ctx.lineWidth = 1.8;
    for (const y of [66, 75, 84]) {
      ctx.beginPath();
      ctx.moveTo(48, y);
      ctx.lineTo(80, y);
      ctx.stroke();
    }

    // Twin red tail lamps
    ctx.fillStyle = TAILLIGHT_COLOR;
    drawRoundRect(ctx, 47, 92, 8, 3.2, 1.5);
    ctx.fill();
    drawRoundRect(ctx, 73, 92, 8, 3.2, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 2. Economy: sculpted compact sedan with hood creases, side mirrors, glasshouse & lamps. */
function drawEconomySedan(ctx: CanvasRenderingContext2D, pal: PaletteSpec, isShadow: boolean): void {
  const fill = (color: string) => (isShadow ? SHADOW_FILL : color);
  ctx.save();

  // Wheel hints & side mirrors
  if (!isShadow) {
    ctx.fillStyle = TIRE_COLOR;
    for (const [x, y] of [
      [40, 31],
      [83, 31],
      [40, 80],
      [83, 80],
    ] as const) {
      drawRoundRect(ctx, x, y, 5, 13, 2);
      ctx.fill();
    }
    // Side wing mirrors
    ctx.fillStyle = pal.primary;
    ctx.strokeStyle = STROKE_INK;
    ctx.lineWidth = 1.6;
    drawRoundRect(ctx, 37, 45, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
    drawRoundRect(ctx, 84, 45, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sculpted sedan body
  drawRoundRect(ctx, 43, 18, 42, 92, [15, 15, 11, 11]);
  ctx.fillStyle = fill(pal.primary);
  ctx.fill();

  if (!isShadow) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();

    // Subtle hood crease lines
    ctx.strokeStyle = pal.rib;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(52, 24);
    ctx.lineTo(54, 41);
    ctx.moveTo(76, 24);
    ctx.lineTo(74, 41);
    ctx.stroke();

    // Swept front windshield
    ctx.beginPath();
    ctx.moveTo(48, 43);
    ctx.quadraticCurveTo(64, 38, 80, 43);
    ctx.lineTo(76, 56);
    ctx.quadraticCurveTo(64, 53, 52, 56);
    ctx.closePath();
    ctx.fillStyle = GLASS_COLOR;
    ctx.fill();

    // Side cabin windows
    ctx.beginPath();
    ctx.moveTo(47, 47);
    ctx.lineTo(51, 58);
    ctx.lineTo(51, 83);
    ctx.lineTo(47, 89);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(81, 47);
    ctx.lineTo(77, 58);
    ctx.lineTo(77, 83);
    ctx.lineTo(81, 89);
    ctx.closePath();
    ctx.fill();

    // Rear glass
    ctx.beginPath();
    ctx.moveTo(52, 85);
    ctx.quadraticCurveTo(64, 87, 76, 85);
    ctx.lineTo(79, 95);
    ctx.quadraticCurveTo(64, 97, 49, 95);
    ctx.closePath();
    ctx.fill();

    // Clean roof panel
    drawRoundRect(ctx, 52, 57, 24, 27, 4);
    ctx.fillStyle = pal.roof;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = pal.rib;
    ctx.stroke();

    // Twin front headlights
    ctx.fillStyle = HEADLIGHT_COLOR;
    ctx.strokeStyle = STROKE_INK;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, 47, 20, 9, 4.5, 2);
    ctx.fill();
    ctx.stroke();
    drawRoundRect(ctx, 72, 20, 9, 4.5, 2);
    ctx.fill();
    ctx.stroke();

    // Twin rear taillights
    ctx.fillStyle = TAILLIGHT_COLOR;
    drawRoundRect(ctx, 47, 105, 10, 3.5, 1.5);
    ctx.fill();
    drawRoundRect(ctx, 71, 105, 10, 3.5, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 3. Minivan: 7-seater HiAce/MPV with snub nose, panoramic windshield & ribbed long roof. */
function drawMinivan(ctx: CanvasRenderingContext2D, pal: PaletteSpec, isShadow: boolean): void {
  const fill = (color: string) => (isShadow ? SHADOW_FILL : color);
  ctx.save();

  if (!isShadow) {
    ctx.fillStyle = TIRE_COLOR;
    for (const [x, y] of [
      [38, 25],
      [85, 25],
      [38, 86],
      [85, 86],
    ] as const) {
      drawRoundRect(ctx, x, y, 5, 14, 2);
      ctx.fill();
    }
    // Wide van side mirrors
    ctx.fillStyle = pal.primary;
    ctx.strokeStyle = STROKE_INK;
    ctx.lineWidth = 1.6;
    drawRoundRect(ctx, 35, 32, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
    drawRoundRect(ctx, 86, 32, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Long van silhouette
  drawRoundRect(ctx, 41, 14, 46, 100, [11, 11, 8, 8]);
  ctx.fillStyle = fill(pal.primary);
  ctx.fill();

  if (!isShadow) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();

    // Wide upright front windshield
    ctx.beginPath();
    ctx.moveTo(45, 27);
    ctx.quadraticCurveTo(64, 23, 83, 27);
    ctx.lineTo(80, 40);
    ctx.quadraticCurveTo(64, 38, 48, 40);
    ctx.closePath();
    ctx.fillStyle = GLASS_COLOR;
    ctx.fill();

    // Long side window bands
    drawRoundRect(ctx, 44, 42, 4, 58, 2);
    ctx.fill();
    drawRoundRect(ctx, 80, 42, 4, 58, 2);
    ctx.fill();

    // Rear tailgate window
    drawRoundRect(ctx, 49, 102, 30, 6, 2);
    ctx.fill();

    // Roof rack / structural ribs
    drawRoundRect(ctx, 49, 43, 30, 56, 4);
    ctx.fillStyle = pal.roof;
    ctx.fill();
    ctx.strokeStyle = pal.rib;
    ctx.lineWidth = 1.6;
    for (const y of [55, 71, 87]) {
      ctx.beginPath();
      ctx.moveTo(52, y);
      ctx.lineTo(76, y);
      ctx.stroke();
    }

    // Headlights & vertical rear lamps
    ctx.fillStyle = HEADLIGHT_COLOR;
    ctx.strokeStyle = STROKE_INK;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, 45, 16, 9, 4.5, 2);
    ctx.fill();
    ctx.stroke();
    drawRoundRect(ctx, 74, 16, 9, 4.5, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = TAILLIGHT_COLOR;
    drawRoundRect(ctx, 44, 109, 9, 3.5, 1.5);
    ctx.fill();
    drawRoundRect(ctx, 75, 109, 9, 3.5, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 4. Cargo: articulated commercial box truck (cab-over engine + corrugated rear cargo box). */
function drawCargoTruck(ctx: CanvasRenderingContext2D, pal: PaletteSpec, isShadow: boolean): void {
  const fill = (color: string) => (isShadow ? SHADOW_FILL : color);
  ctx.save();

  if (!isShadow) {
    ctx.fillStyle = TIRE_COLOR;
    for (const [x, y] of [
      [38, 22],
      [85, 22],
      [37, 84],
      [86, 84],
    ] as const) {
      drawRoundRect(ctx, x, y, 5, 14, 2);
      ctx.fill();
    }
    // Large truck side mirrors
    ctx.fillStyle = TIRE_COLOR;
    drawRoundRect(ctx, 35, 25, 6, 5.5, 1.5);
    ctx.fill();
    drawRoundRect(ctx, 87, 25, 6, 5.5, 1.5);
    ctx.fill();
  }

  // Forward cab-over unit
  drawRoundRect(ctx, 42, 13, 44, 31, [9, 9, 4, 4]);
  ctx.fillStyle = fill(pal.primary);
  ctx.fill();
  if (!isShadow) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();
  }

  // Chassis bridge between cab and cargo box
  drawRoundRect(ctx, 51, 43, 26, 6, 1);
  ctx.fillStyle = fill(TIRE_COLOR);
  ctx.fill();

  // Corrugated rectangular cargo box
  const boxFill = pal.primary === "#374151" ? "#FFFFFF" : pal.secondary;
  drawRoundRect(ctx, 39, 48, 50, 68, [4, 4, 4, 4]);
  ctx.fillStyle = fill(boxFill);
  ctx.fill();

  if (!isShadow) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = STROKE_INK;
    ctx.stroke();

    // Wide cab windshield
    ctx.beginPath();
    ctx.moveTo(46, 20);
    ctx.quadraticCurveTo(64, 17, 82, 20);
    ctx.lineTo(80, 31);
    ctx.quadraticCurveTo(64, 29, 48, 31);
    ctx.closePath();
    ctx.fillStyle = GLASS_COLOR;
    ctx.fill();

    // Structural roof corrugation ribs on cargo box
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    for (const y of [58, 68, 78, 88, 98, 108]) {
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(84, y);
      ctx.stroke();
    }

    // Cab front bumper headlights & rear box tail lamps
    ctx.fillStyle = HEADLIGHT_COLOR;
    ctx.strokeStyle = STROKE_INK;
    ctx.lineWidth = 1;
    drawRoundRect(ctx, 45, 14.5, 9, 4, 1.5);
    ctx.fill();
    ctx.stroke();
    drawRoundRect(ctx, 74, 14.5, 9, 4, 1.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = TAILLIGHT_COLOR;
    drawRoundRect(ctx, 43, 112, 10, 3.5, 1.2);
    ctx.fill();
    drawRoundRect(ctx, 75, 112, 10, 3.5, 1.2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTierShape(
  ctx: CanvasRenderingContext2D,
  tier: Tier,
  pal: PaletteSpec,
  isShadow: boolean,
): void {
  switch (tier) {
    case "bajaj":
      drawBajaj(ctx, pal, isShadow);
      break;
    case "economy":
      drawEconomySedan(ctx, pal, isShadow);
      break;
    case "minivan":
      drawMinivan(ctx, pal, isShadow);
      break;
    case "cargo":
      drawCargoTruck(ctx, pal, isShadow);
      break;
  }
}

function renderVehicleSprite(
  tier: Tier,
  status: VehicleStatus,
  selected: boolean,
  isPlayerDriver: boolean,
): ImageData {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new ImageData(size, size);
  }

  const pal = paletteFor(tier, status, isPlayerDriver);

  if (selected) {
    drawSelectionRing(ctx);
  }

  // Flat architectural ground offset shadow (no blur)
  ctx.save();
  ctx.translate(3, 4);
  drawTierShape(ctx, tier, pal, true);
  ctx.restore();

  // Sharp foreground vehicle illustration
  drawTierShape(ctx, tier, pal, false);

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Registers high-DPI (128x128 @2x) top-down vehicle illustrations for every
 * tier (Bajaj, Economy Sedan, Minivan, Cargo Box Truck) × status × selection.
 * Zero gradients, zero blur — pure flat industrial vector art.
 */
export function registerVehicleSprites(map: MapLibreMap): void {
  for (const tier of TIER_ORDER) {
    for (const status of STATUSES) {
      for (const selected of [false, true]) {
        const key = vehicleSpriteKey(tier, status, selected, false);
        if (!map.hasImage(key)) {
          map.addImage(key, renderVehicleSprite(tier, status, selected, false), {
            pixelRatio: 2,
          });
        }
      }
    }

    // Player driver idle variant (Pure Black #09090B)
    for (const selected of [false, true]) {
      const key = vehicleSpriteKey(tier, "idle", selected, true);
      if (!map.hasImage(key)) {
        map.addImage(key, renderVehicleSprite(tier, "idle", selected, true), {
          pixelRatio: 2,
        });
      }
    }
  }
}
