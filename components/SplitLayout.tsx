import { ReactNode } from "react";
import { Card } from "./Card";

export function SplitLayout({
  leftTitle,
  left,
  rightTitle,
  right,
  hideLeftOnMobile = true,
}: {
  leftTitle: string;
  left: ReactNode;
  rightTitle: string;
  right: ReactNode;
  hideLeftOnMobile?: boolean;
}) {
  return (
    <div className={`split-layout ${hideLeftOnMobile ? "split-hide-left-mobile" : ""}`}>
      <Card className="split-panel">
        {leftTitle ? <h3 className="split-panel-title">{leftTitle}</h3> : null}
        <div className="panel-body">{left}</div>
      </Card>

      <Card className="split-panel">
        {rightTitle ? <h3 className="split-panel-title">{rightTitle}</h3> : null}
        <div className="panel-body">{right}</div>
      </Card>
    </div>
  );
}
