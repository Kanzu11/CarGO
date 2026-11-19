import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export default function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <Wordmark />
      <div>
        <p className="num text-[13px] font-medium text-muted">404</p>
        <h1 className="mt-1 text-[16px] font-semibold text-ink">This route isn’t on the map</h1>
        <p className="mt-1 text-[13px] text-muted">The page you’re looking for doesn’t exist or has moved.</p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-[14px] font-medium text-white hover:bg-[#27272a]"
      >
        Back to CarGo
      </Link>
    </main>
  );
}
