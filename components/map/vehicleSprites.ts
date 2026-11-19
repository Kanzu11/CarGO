import type { Map as MapLibreMap } from "maplibre-gl";
import { vehicleSpriteKey, vehicleStatusColor } from "@/components/map/vehicleModels";
import type { VehicleStatus } from "@/types/fleet";

const STATUSES: ReadonlyArray<VehicleStatus> = [
  "idle",
  "enroute_pickup",
  "on_trip",
  "offline",
  "alert",
];

function drawChevronSprite(fillColor: string, selected: boolean): ImageData {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new ImageData(size, size);
  }

  const cx = size / 2;
  const cy = size / 2;

  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#09090B";
    ctx.stroke();
  }

  // Flat solid circle with crisp white border
  ctx.beginPath();
  ctx.arc(cx, cy, 21, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();

  // Sharp North-pointing directional arrow inside the disc
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11);
  ctx.lineTo(cx + 8, cy + 7);
  ctx.lineTo(cx, cy + 3);
  ctx.lineTo(cx - 8, cy + 7);
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Registers flat directional chevron sprites (no gradients, no shadows) for
 * low-zoom rendering (`zoom < 15`) across all vehicle statuses & selection states.
 */
export function registerVehicleSprites(map: MapLibreMap): void {
  const combinations: Array<{
    status: VehicleStatus;
    selected: boolean;
    isPlayer: boolean;
  }> = [];

  for (const status of STATUSES) {
    combinations.push({ status, selected: false, isPlayer: false });
    combinations.push({ status, selected: true, isPlayer: false });
  }
  combinations.push({ status: "idle", selected: false, isPlayer: true });
  combinations.push({ status: "idle", selected: true, isPlayer: true });

  for (const combo of combinations) {
    const key = vehicleSpriteKey(combo.status, combo.selected, combo.isPlayer);
    if (map.hasImage(key)) continue;
    const color = vehicleStatusColor(combo.status, combo.isPlayer);
    const data = drawChevronSprite(color, combo.selected);
    map.addImage(key, data, { pixelRatio: 2 });
  }
}
