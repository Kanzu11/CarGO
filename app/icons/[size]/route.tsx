import { renderBrandIcon } from "@/lib/brandIcon";

const SIZES = ["192", "512"] as const;
type IconSize = (typeof SIZES)[number];

export const dynamicParams = false;

export function generateStaticParams(): Array<{ size: IconSize }> {
  return SIZES.map((size) => ({ size }));
}

/** PWA / TWA maskable launcher icons: /icons/192 and /icons/512 (PNG). */
export async function GET(_request: Request, context: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size } = await context.params;
  if (!SIZES.includes(size as IconSize)) {
    return new Response("Not found", { status: 404 });
  }
  return renderBrandIcon(Number(size), { maskable: true });
}
