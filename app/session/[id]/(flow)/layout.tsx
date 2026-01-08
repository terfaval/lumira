// app/session/[id]/(flow)/layout.tsx
import type { ReactNode } from "react";
import FlowShellClient from "./FlowShellClient";

export default function FlowLayout({ children }: { children: ReactNode }) {
  return <FlowShellClient>{children}</FlowShellClient>;
}
