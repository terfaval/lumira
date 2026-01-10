// app/session/[id]/(flow)/layout.tsx
import type { ReactNode } from "react";
import FlowShellClient from "./FlowShellClient";

export default function FlowLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return <FlowShellClient modal={modal}>{children}</FlowShellClient>;
}
