import Link from "next/link";
import { LumiraMark } from "./LumiraMark";

export function BrandLockup({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand-lockup" aria-label="Lumira">
      <LumiraMark size={22} className="brand-mark" />
      <span className="brand-word">Lumira</span>
    </Link>
  );
}
