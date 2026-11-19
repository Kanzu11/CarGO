"use client";

import { MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusDot } from "@/components/ui/StatusDot";
import { useNow } from "@/hooks/useNow";
import { paymentMethodLabel } from "@/lib/eta";
import { clamp } from "@/lib/geo";
import { useFleetStore } from "@/store/useFleetStore";
import type { DriverJobOffer } from "@/types/fleet";

export interface IncomingRequestCardProps {
  offer: DriverJobOffer;
}

const OFFER_WINDOW_MS = 20000;

/**
 * Incoming Driver Mode dispatch offer triggered 3s after going online.
 * Shows Pickup Landmark Tag, Distance, Payment Method, Locked ETB Payout, and Accept/Decline.
 */
export function IncomingRequestCard({ offer }: IncomingRequestCardProps) {
  const acceptDriverJob = useFleetStore((s) => s.acceptDriverJob);
  const declineDriverJob = useFleetStore((s) => s.declineDriverJob);
  const now = useNow(200);

  const remainingMs = now !== null ? Math.max(0, offer.expiresAt - now) : OFFER_WINDOW_MS;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const pct = clamp(remainingMs / OFFER_WINDOW_MS, 0, 1) * 100;

  return (
    <div
      role="region"
      aria-label="Incoming ride request"
      className="space-y-2.5 rounded-lg border border-brand bg-canvas p-3"
    >
      {/* Countdown strip */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-live transition-[width] duration-200"
          style={{ width: `${pct.toFixed(0)}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <StatusDot tone="warn" pulse size={8} />
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink">
              New Request
            </span>
            <span className="num text-[12px] text-muted">· {remainingSec}s</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge tone={offer.payment === "telebirr" ? "live" : "neutral"}>
              {paymentMethodLabel(offer.payment)}
            </Badge>
            <span className="num text-[12px] text-muted">
              {offer.pickupDistanceKm.toFixed(1)} km away · {offer.tripDistanceKm.toFixed(1)} km trip
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-[20px] font-semibold leading-tight text-ink">
            {offer.payoutEtb} ETB
          </p>
          <p className="text-[11px] text-muted">Locked payout</p>
        </div>
      </div>

      {/* Pickup Landmark Tag & Dropoff */}
      <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5 text-[12px]">
        <div className="flex items-start gap-2">
          <Icon icon={MapPin} size={14} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Pickup Landmark
            </p>
            <p className="font-semibold text-ink">{offer.landmarkTag}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 border-t border-line pt-1.5">
          <Icon icon={Navigation} size={14} className="mt-0.5 shrink-0 text-live" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Dropoff
            </p>
            <p className="truncate font-medium text-ink">{offer.dropoff.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" block onClick={declineDriverJob}>
          Decline
        </Button>
        <Button variant="live" block onClick={acceptDriverJob}>
          Accept
        </Button>
      </div>
    </div>
  );
}
