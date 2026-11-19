import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceWorker = path.join(rootDir, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const publicDir = path.join(rootDir, "public");
const targetWorker = path.join(publicDir, "maplibre-gl-worker.mjs");

if (!existsSync(sourceWorker)) {
  console.error(`[sync-maplibre-worker] Source worker not found at ${sourceWorker}`);
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(sourceWorker, targetWorker);
console.log(`[sync-maplibre-worker] Copied worker to ${path.relative(rootDir, targetWorker)}`);
