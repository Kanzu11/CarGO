import Link from "next/link";
import { ArrowRight, LayoutDashboard, Palette } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { StatusDot } from "@/components/ui/StatusDot";

/**
 * Phase 1 entry screen. The full-screen 3D rider & driver app replaces this in Phase 4.
 */
export default function HomePage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <header className="pt-safe border-b border-line bg-canvas">
        <div className="flex h-12 items-center justify-between px-4">
          <Wordmark />
          <Link
            href="/dispatch"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink hover:bg-surface"
          >
            <Icon icon={LayoutDashboard} size={14} />
            Ops View
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-line bg-canvas">
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-live">
              <StatusDot tone="live" pulse size={6} />
              Foundation online
            </div>
            <h1 className="mt-2 text-[16px] font-semibold text-ink">CarGo — Fleet & Landmark Dispatch</h1>
            <p className="mt-1 text-[13px] text-muted">
              Design system, PWA manifest, TWA verification and network resilience are in place. The live 3D rider
              and driver app arrives in Phase 4.
            </p>
          </div>
          <nav className="divide-y divide-line">
            <Link href="/design" className="flex items-center justify-between px-4 py-3 text-[14px] hover:bg-surface">
              <span className="inline-flex items-center gap-2.5">
                <Icon icon={Palette} size={16} className="text-muted" />
                Design system
              </span>
              <Icon icon={ArrowRight} size={16} className="text-muted" />
            </Link>
            <Link href="/dispatch" className="flex items-center justify-between px-4 py-3 text-[14px] hover:bg-surface">
              <span className="inline-flex items-center gap-2.5">
                <Icon icon={LayoutDashboard} size={16} className="text-muted" />
                Ops command center
              </span>
              <Icon icon={ArrowRight} size={16} className="text-muted" />
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
