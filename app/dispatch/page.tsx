import type { Metadata } from "next";
import { OpsShell } from "@/components/dispatch/OpsShell";

export const metadata: Metadata = {
  title: "Ops Command Center",
};

export default function DispatchPage() {
  return <OpsShell />;
}
