import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "live";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white border border-brand hover:bg-[#27272a] active:bg-black",
  secondary: "bg-canvas text-ink border border-line hover:bg-surface active:bg-[#f1f3f5]",
  danger: "bg-canvas text-danger border border-danger hover:bg-danger-soft active:bg-[#fee2e2]",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-surface active:bg-[#f1f3f5]",
  live: "bg-live text-white border border-live hover:bg-[#065f46] active:bg-[#064e3b]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-[14px] gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

const iconSize: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  leadingIcon,
  trailingIcon,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-lg font-medium leading-none",
        "transition-colors duration-100 disabled:opacity-40",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent"
          aria-hidden
        />
      ) : (
        leadingIcon && <Icon icon={leadingIcon} size={iconSize[size]} />
      )}
      {children}
      {trailingIcon && !loading && <Icon icon={trailingIcon} size={iconSize[size]} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "leadingIcon" | "trailingIcon" | "children"> {
  icon: LucideIcon;
  label: string;
}

/** Square icon-only button with an accessible label. */
export function IconButton({ icon, label, size = "md", variant = "secondary", className, ...rest }: IconButtonProps) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn("!px-0", dim, className)}
      {...rest}
    >
      <Icon icon={icon} size={iconSize[size]} />
    </Button>
  );
}
