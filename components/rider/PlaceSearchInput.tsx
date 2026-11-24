"use client";

import { MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getStrings, localizePlaceName } from "@/lib/i18n";
import { searchLocalPlaces, searchOnlineCityStreets } from "@/lib/placeSearch";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId, LngLat, Place } from "@/types/fleet";

export interface PlaceSearchInputProps {
  cityId: CityId;
  referenceCoords: LngLat;
  targetLabel: string;
  onSelectPlace: (place: Place) => void;
}

function formatShortDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Instant bilingual (`EN` / `አማ`) landmark & neighborhood search input with
 * optional bounded OpenStreetMap street lookup when online.
 */
export function PlaceSearchInput({
  cityId,
  referenceCoords,
  targetLabel,
  onSelectPlace,
}: PlaceSearchInputProps) {
  const locale = useFleetStore((s) => s.locale);
  const s = getStrings(locale);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [onlinePlaces, setOnlinePlaces] = useState<Place[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const localResults = useMemo(
    () => searchLocalPlaces(cityId, query, locale, referenceCoords).slice(0, 6),
    [cityId, query, locale, referenceCoords],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchOnlineCityStreets(cityId, trimmed, locale, controller.signal).then((found) => {
        if (!controller.signal.aborted) {
          setOnlinePlaces(found);
        }
      });
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cityId, query, locale]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const combinedResults = useMemo(() => {
    const trimmed = query.trim();
    const seenNames = new Set(localResults.map((r) => r.place.name.toLowerCase()));
    const merged = [...localResults];
    if (trimmed.length >= 3) {
      for (const remote of onlinePlaces) {
        if (seenNames.has(remote.name.toLowerCase())) continue;
        seenNames.add(remote.name.toLowerCase());
        merged.push({ place: remote, distanceMeters: 0 });
      }
    }
    return merged.slice(0, 7);
  }, [localResults, onlinePlaces, query]);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Icon
          icon={Search}
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) {
              setOnlinePlaces([]);
            }
            setOpen(true);
          }}
          placeholder={`${targetLabel}: ${s.searchPlacePlaceholder}`}
          aria-label={s.searchPlacePlaceholder}
          className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-[13px] text-ink placeholder:text-muted focus:border-brand focus:bg-canvas focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOnlinePlaces([]);
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
          >
            <Icon icon={X} size={13} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          aria-label="Matching city places"
          className="absolute inset-x-0 top-10 z-40 max-h-52 scroll-y divide-y divide-line rounded-lg border border-brand bg-canvas"
        >
          {combinedResults.length > 0 ? (
            combinedResults.map(({ place, distanceMeters }) => (
              <button
                key={place.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelectPlace(place);
                  setQuery("");
                  setOnlinePlaces([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon icon={MapPin} size={13} className="shrink-0 text-live" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {localizePlaceName(place, locale)}
                    </p>
                    <p className="truncate text-[11px] text-muted">{place.neighborhood}</p>
                  </div>
                </div>
                {distanceMeters > 0 && (
                  <span className="num shrink-0 text-[11px] text-muted">
                    {formatShortDistance(distanceMeters)}
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-[12px] text-muted">{s.noPlacesFound}</p>
          )}
        </div>
      )}
    </div>
  );
}
