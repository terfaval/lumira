import { ReactNode } from "react";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

type CardProps = {
  children: ReactNode;
  muted?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({
  children,
  muted = false,
  className = "",
  ...rest
}: CardProps) {
  return (
    <GlassCardSurface
      variant="flat"
      paper={muted ? "plain" : "evening"}
      className={className}
      {...rest}
    >
      {children}
    </GlassCardSurface>
  );
}