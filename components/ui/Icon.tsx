import type { LucideIcon, LucideProps } from "lucide-react";

export interface IconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
}

/**
 * Lucide wrapper that enforces the CarGo icon spec: crisp 1.5px stroke,
 * 16px default, decorative by default (aria-hidden) unless labelled.
 */
export function Icon({ icon: Glyph, size = 16, strokeWidth = 1.5, ...rest }: IconProps) {
  const labelled = Boolean(rest["aria-label"]);
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...rest}
    />
  );
}
