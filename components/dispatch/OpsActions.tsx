"use client";

import { Flag, MessageSquarePlus, RefreshCw, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { getStrings } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { Trip, Vehicle } from "@/types/fleet";

export interface OpsActionsProps {
  vehicle: Vehicle;
  activeTrip?: Trip;
}

/**
 * Operational actions inside the `/dispatch` inspector:
 * Reassign Driver, Send Landmark Note, and Flag Alert.
 */
export function OpsActions({ vehicle, activeTrip }: OpsActionsProps) {
  const locale = useFleetStore((s) => s.locale);
  const opsReassignDriver = useFleetStore((s) => s.opsReassignDriver);
  const opsSendLandmarkNote = useFleetStore((s) => s.opsSendLandmarkNote);
  const opsToggleFlagVehicle = useFleetStore((s) => s.opsToggleFlagVehicle);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const s = getStrings(locale);

  const submitNote = (e: FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !noteText.trim()) return;
    opsSendLandmarkNote(activeTrip.id, noteText);
    setNoteText("");
    setNoteOpen(false);
  };

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {s.dispatchActions}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={RefreshCw}
          disabled={!activeTrip}
          onClick={() => activeTrip && opsReassignDriver(activeTrip.id)}
        >
          {s.reassignDriver}
        </Button>

        <Button
          variant={vehicle.flagged ? "secondary" : "danger"}
          size="sm"
          leadingIcon={Flag}
          onClick={() => opsToggleFlagVehicle(vehicle.id)}
        >
          {vehicle.flagged ? s.clearAlert : s.flagAlert}
        </Button>
      </div>

      <Button
        variant="secondary"
        size="sm"
        block
        leadingIcon={MessageSquarePlus}
        disabled={!activeTrip}
        onClick={() => setNoteOpen((open) => !open)}
      >
        {s.sendLandmarkNote}
      </Button>

      {noteOpen && activeTrip && (
        <form onSubmit={submitNote} className="flex items-center gap-1.5">
          <input
            type="text"
            aria-label={s.landmarkNoteLabel}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            maxLength={80}
            placeholder={s.notePlaceholder}
            className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:bg-canvas focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            leadingIcon={Send}
            disabled={!noteText.trim()}
          >
            {s.send}
          </Button>
        </form>
      )}
    </div>
  );
}
