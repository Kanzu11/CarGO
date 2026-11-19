import { ImageResponse } from "next/og";

/**
 * Renders the CarGo app icon as a PNG via next/og (no binary assets in the repo).
 * `maskable` keeps the glyph inside the 80% safe zone so Android adaptive-icon
 * masks (circle, squircle, teardrop) never crop it.
 */
export function renderBrandIcon(size: number, { maskable = true }: { maskable?: boolean } = {}): ImageResponse {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  const stroke = Math.max(2, Math.round(glyph * 0.11));
  const dot = Math.round(glyph * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090B",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24">
          <path
            d="M18 6.5A7.6 7.6 0 1 0 18 17.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={(stroke / glyph) * 24}
            strokeLinecap="round"
          />
          <circle cx="18.2" cy="17.3" r={(dot / glyph) * 12} fill="#047857" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
