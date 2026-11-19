"use client";

import { Banknote, Smartphone, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { localizePayment } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { PaymentMethod } from "@/types/fleet";

export interface PaymentToggleProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

/** Flat 3-way Ethiopian mobile money & cash selector. */
export function PaymentToggle({ value, onChange }: PaymentToggleProps) {
  const locale = useFleetStore((s) => s.locale);

  const options = useMemo<ReadonlyArray<SegmentedOption<PaymentMethod>>>(
    () => [
      { value: "cash", label: localizePayment("cash", locale), icon: Banknote },
      { value: "telebirr", label: localizePayment("telebirr", locale), icon: Smartphone },
      { value: "cbe_birr", label: localizePayment("cbe_birr", locale), icon: Wallet },
    ],
    [locale],
  );

  return (
    <Segmented<PaymentMethod>
      label="Payment method"
      size="sm"
      block
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
