import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { DesignGallery } from "@/components/design/DesignGallery";

export const metadata: Metadata = {
  title: "Design System",
};

export default function DesignPage() {
  return (
    <main className="scroll-y h-dvh bg-canvas">
      <header className="pt-safe sticky top-0 z-10 border-b border-line bg-canvas">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4">
          <Wordmark suffix="Design" />
          <Link href="/" className="text-[13px] font-medium text-muted hover:text-ink">
            Back to app
          </Link>
        </div>
      </header>
      <DesignGallery />
    </main>
  );
}
