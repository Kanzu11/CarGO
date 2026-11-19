import { describe, expect, it } from "vitest";
import { rewriteCartoGlyphUrl } from "@/components/map/map3d";
import { CITIES, CITY_ORDER, detectNearestSupportedCity } from "@/lib/cities";
import {
  formatEtb,
  getStrings,
  localizeCityName,
  localizePlaceName,
  localizeTier,
} from "@/lib/i18n";
import { TIER_ORDER } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";

describe("Amharic (am) i18n, Carto glyph fix & dual GPS/Sim location", () => {
  it("rewrites Carto Positron non-ASCII glyph requests to Noto Sans Regular to eliminate 404s", () => {
    const encoded =
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Noto%20Sans%20Italic/4608-4863.pbf";
    expect(rewriteCartoGlyphUrl(encoded)).toBe(
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Noto%20Sans%20Regular/4608-4863.pbf",
    );

    const unencoded =
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Noto Sans Italic/4608-4863.pbf";
    expect(rewriteCartoGlyphUrl(unencoded)).toBe(
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Noto%20Sans%20Regular/4608-4863.pbf",
    );

    const openSans =
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Open%20Sans%20Italic/4608-4863.pbf";
    expect(rewriteCartoGlyphUrl(openSans)).toBe(
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Noto%20Sans%20Regular/4608-4863.pbf",
    );

    const ascii =
      "https://tiles.basemaps.cartocdn.com/v/20261118-01/fonts/Montserrat%20Medium/0-255.pbf";
    expect(rewriteCartoGlyphUrl(ascii)).toBe(ascii);

    const ofm = "https://tiles.openfreemap.org/fonts/Noto%20Sans%20Italic/4608-4863.pbf";
    expect(rewriteCartoGlyphUrl(ofm)).toBe(ofm);
  });

  it("maintains full dictionary parity and non-empty strings in English and Amharic", () => {
    const en = getStrings("en");
    const am = getStrings("am");
    expect(Object.keys(am).sort()).toEqual(Object.keys(en).sort());

    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(en[key].length).toBeGreaterThan(0);
      expect(am[key].length).toBeGreaterThan(0);
    }
    expect(formatEtb(85, "en")).toBe("85 ETB");
    expect(formatEtb(85, "am")).toBe("85 ብር");
  });

  it("translates every Ethiopian city, tier, and landmark into Amharic", () => {
    for (const cityId of CITY_ORDER) {
      expect(localizeCityName(cityId, "am")).not.toBe(localizeCityName(cityId, "en"));
      for (const place of [...CITIES[cityId].landmarks, ...CITIES[cityId].neighborhoods]) {
        const am = localizePlaceName(place, "am");
        expect(am.length).toBeGreaterThan(0);
        expect(am).not.toBe(place.name);
      }
    }
    for (const tier of TIER_ORDER) {
      expect(localizeTier(tier, "am").name).not.toBe(localizeTier(tier, "en").name);
    }
  });

  it("detects nearest Ethiopian city and preserves dual Real GPS vs Simulated location modes", () => {
    const inAdama = detectNearestSupportedCity([39.271, 8.542]);
    expect(inAdama.cityId).toBe("adama");
    expect(inAdama.isWithinCity).toBe(true);

    const inAddis = detectNearestSupportedCity([38.761, 9.01]);
    expect(inAddis.cityId).toBe("addis");
    expect(inAddis.isWithinCity).toBe(true);

    const abroad = detectNearestSupportedCity([-0.1276, 51.5072]);
    expect(abroad.isWithinCity).toBe(false);

    // Dual GPS / Sim toggling in Zustand store
    const store = useFleetStore.getState();
    store.applyRealLocation([39.2692, 8.5414], 14, true);
    let current = useFleetStore.getState();
    expect(current.cityId).toBe("adama");
    expect(current.locationSource).toBe("real");
    expect(current.pickup.name).toContain("GPS");
    expect(current.pickup.coords).toEqual([39.2692, 8.5414]);

    current.setLocationSource("simulated");
    current = useFleetStore.getState();
    expect(current.locationSource).toBe("simulated");
    expect(current.userGeo).not.toBeNull();

    current.setLocationSource("real");
    current = useFleetStore.getState();
    expect(current.locationSource).toBe("real");
    expect(current.pickup.coords).toEqual([39.2692, 8.5414]);
  });
});
