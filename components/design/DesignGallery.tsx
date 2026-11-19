"use client";

import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Bus,
  Truck,
  ShieldAlert,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { StatusDot } from "@/components/ui/StatusDot";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/store/useToastStore";

const swatches = [
  { name: "Canvas", hex: "#FFFFFF", className: "bg-canvas" },
  { name: "Surface", hex: "#F8F9FA", className: "bg-surface" },
  { name: "Ink", hex: "#111827", className: "bg-ink" },
  { name: "Muted", hex: "#6B7280", className: "bg-muted" },
  { name: "Line", hex: "#E5E7EB", className: "bg-line" },
  { name: "Brand", hex: "#09090B", className: "bg-brand" },
  { name: "Live", hex: "#047857", className: "bg-live" },
  { name: "Warn", hex: "#D97706", className: "bg-warn" },
  { name: "Danger", hex: "#DC2626", className: "bg-danger" },
] as const;

type Mode = "rider" | "driver";
type Pay = "cash" | "telebirr" | "cbe";
type City = "adama" | "addis" | "hawassa" | "worabe";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-6 last:border-b-0">
      <h2 className="mb-4 text-[12px] font-medium uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function DesignGallery() {
  const [mode, setMode] = useState<Mode>("rider");
  const [pay, setPay] = useState<Pay>("telebirr");
  const [city, setCity] = useState<City>("adama");
  const [online, setOnline] = useState(true);
  const [fare, setFare] = useState(85);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <Section title="Color">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="overflow-hidden rounded-lg border border-line">
              <div className={`h-12 border-b border-line ${swatch.className}`} />
              <div className="px-2 py-1.5">
                <p className="text-[12px] font-medium">{swatch.name}</p>
                <p className="num font-mono text-2xs text-muted">{swatch.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography & tabular numerals">
        <div className="space-y-1">
          <p className="text-[16px] font-semibold">Header 16 — Confirm your pickup</p>
          <p className="text-[15px] font-semibold">Header 15 — Choose a ride</p>
          <p className="text-[14px]">Body 14 — Meet your driver at ASTU Main Gate.</p>
          <p className="text-[13px] text-muted">Body 13 — In front of the blue gate, beside CBE.</p>
          <p className="text-[12px] text-muted">Caption 12 — Updated just now</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="num rounded-lg border border-line px-3 py-2 text-[20px] font-semibold">{fare} ETB</span>
          <Button variant="secondary" size="sm" onClick={() => setFare((value) => value + 5)}>
            +5 ETB
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setFare(1111)}>
            Set 1111
          </Button>
          <span className="text-[12px] text-muted">Width never jitters.</span>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button trailingIcon={ArrowRight}>Confirm Bajaj • {fare} ETB</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger" leadingIcon={ShieldAlert}>
            SOS
          </Button>
          <Button variant="live">Accept</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Searching</Button>
          <IconButton icon={X} label="Close" />
        </div>
      </Section>

      <Section title="Controls">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              label="City"
              value={city}
              onChange={setCity}
              size="sm"
              options={[
                { value: "adama", label: "Adama" },
                { value: "addis", label: "Addis Ababa" },
                { value: "hawassa", label: "Hawassa" },
                { value: "worabe", label: "Worabe" },
              ]}
            />
            <Segmented
              label="App mode"
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "rider", label: "Rider" },
                { value: "driver", label: "Driver" },
              ]}
            />
          </div>
          <Segmented
            label="Payment method"
            block
            value={pay}
            onChange={setPay}
            options={[
              { value: "cash", label: "Cash", icon: Banknote },
              { value: "telebirr", label: "Telebirr", icon: Smartphone },
              { value: "cbe", label: "CBE Birr", icon: Wallet },
            ]}
          />
          <Segmented
            label="Tier filter"
            size="sm"
            value="all"
            onChange={() => undefined}
            options={[
              { value: "all", label: "All", count: 20 },
              { value: "bajaj", label: "Bajaj", icon: Bike, count: 7 },
              { value: "economy", label: "Economy", icon: Car, count: 7 },
              { value: "minivan", label: "Minivan", icon: Bus, count: 3 },
              { value: "cargo", label: "Cargo", icon: Truck, count: 3 },
            ]}
          />
          <Switch
            checked={online}
            onChange={setOnline}
            label={online ? "Online" : "Offline"}
            description="Receive ride requests"
          />
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Bajaj</Badge>
          <Badge tone="live">In progress</Badge>
          <Badge tone="warn">Arriving</Badge>
          <Badge tone="danger">SOS</Badge>
          <Badge tone="brand" solid>
            Economy
          </Badge>
          <Badge mono>OR 3-A45821</Badge>
          <span className="ml-2 inline-flex items-center gap-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="live" pulse /> Online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="warn" /> Arriving
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="danger" /> Offline
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="idle" /> Idle
            </span>
          </span>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast("Driver assigned", { tone: "live", description: "Abebe • OR 3-A45821" })}>
            Live toast
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast("Driver is 2 min away", { tone: "warn" })}>
            Warn toast
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast("SOS sent to CarGo safety", { tone: "danger" })}>
            Danger toast
          </Button>
        </div>
      </Section>

      <Section title="Surfaces">
        <div className="rounded-xl border border-line bg-canvas">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[15px] font-semibold">Bottom sheet — 12px radius, 1px border</p>
            <p className="text-[12px] text-muted">No shadows, no blur. Surfaces separate by hairlines.</p>
          </div>
          <div className="divide-y divide-line">
            {[
              { name: "Bajaj", seats: "3 seats", eta: 3, fare: 85 },
              { name: "Economy", seats: "4 seats", eta: 5, fare: 170 },
            ].map((row) => (
              <div key={row.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium">{row.name}</p>
                  <p className="text-[12px] text-muted">
                    <span className="num">{row.eta} min</span> · {row.seats}
                  </p>
                </div>
                <p className="num text-[14px] font-semibold">{row.fare} ETB</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
