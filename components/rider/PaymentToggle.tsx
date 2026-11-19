"use client";

import { Banknote, Smartphone, Wallet } from "lucide-react";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import type { PaymentMethod } from "@/types/fleet";

const PAYMENT_OPTIONS: ReadonlyArray<SegmentedOption<PaymentMethod>> = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "telebirr", label: "Telebirr", icon: Smartphone },
  { value: "cbe_birr", label: "CBE Birr", icon: Wallet },
];

export interface PaymentToggleProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

/** Flat 3-way Ethiopian mobile money & cash selector. */
export function PaymentToggle({ value, onChange }: PaymentToggleProps) {
  return (
    <Segmented<PaymentMethod>
      label="Payment method"
      size="sm"
      block
      value={value}
      onChange={onChange}
      options={PAYMENT_OPTIONS}
    />
  );
}
