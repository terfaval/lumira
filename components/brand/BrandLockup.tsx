import Link from "next/link";
import { LumiraMark } from "./LumiraMark";

export function BrandLockup({ href = "/new" }: { href?: string }) {
  return (
    <Link href={href} className="brand-lockup" aria-label="Lumira">
      <LumiraMark size={38} className="brand-mark" />
      <span className="brand-word">lumira</span>
    </Link>
  );
}
