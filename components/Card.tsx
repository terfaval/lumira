import { ReactNode } from "react";

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
  const tone = muted ? "card-muted" : "";
  return (
    <div
      {...rest}
      className={["card", tone, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
