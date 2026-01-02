import { ReactNode } from "react";
import { Card } from "./Card";

export function SplitLayout({
  leftTitle,
  left,
  rightTitle,
  right,
}: {
  leftTitle: string;
  left: ReactNode;
  rightTitle: string;
  right: ReactNode;
}) {
  return (
    <div className="split-layout">
      <Card className="split-panel">
        <div className="stack">
          {leftTitle ? <h3 className="split-panel-title">{leftTitle}</h3> : null}
          {left}
        </div>
      </Card>
      <Card className="split-panel">
        <div className="stack">
          {rightTitle ? <h3 className="split-panel-title">{rightTitle}</h3> : null}
          {right}
        </div>
      </Card>
    </div>
  );
}