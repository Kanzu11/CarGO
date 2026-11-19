import type { Metadata } from "next";
import { Phase3DispatchPreview } from "@/components/map/Phase3DispatchPreview";

export const metadata: Metadata = {
  title: "Ops Command Center",
};

export default function DispatchPage() {
  return <Phase3DispatchPreview />;
}
