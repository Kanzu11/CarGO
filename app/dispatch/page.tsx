import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { StatusDot } from "@/components/ui/StatusDot";

export const metadata: Metadata = {
  title: "Ops Command Center",
};

/**
 * Phase 1 shell for the ops command center. The live dashboard replaces this in Phase 5.
 */
export default function DispatchPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-canvas px-4">
        <Wordmark suffix="Ops" />
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <StatusDot tone="idle" size={6} />
            Fleet engine pending
          </span>
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink hover:bg-surface"
          >
            <Icon icon={Smartphone} size={14} />
            Mobile App →
          </Link>
        </div>
      </header>
      <section className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
        <aside className="border-r border-line bg-canvas p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Fleet</p>
          <p className="mt-2 text-[13px] text-muted">The live vehicle list streams in once the fleet engine ships.</p>
        </aside>
        <div className="flex items-center justify-center">
          <p className="text-[13px] text-muted">3D geospatial canvas</p>
        </div>
      </section>
    </main>
  );
}
